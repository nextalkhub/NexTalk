using System.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NexTalk.Messaging.Service.Features.Messages.CreateMessage;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Infrastructure.Outbox;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;
using Polly;
using Prometheus;
using Serilog;
using IPNetwork = System.Net.IPNetwork;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("/zitadel-config/swagger-config.json", optional: true, reloadOnChange: true);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
});

var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection")!;
var wsGatewayUrl = builder.Configuration["Services:WebSocketGateway"]
    ?? throw new InvalidOperationException("Services:WebSocketGateway is not configured");

builder.Services.AddDbContext<MessagingDbContext>(opts =>
    opts.UseNpgsql(pgConnectionString));

// Outbox: in-process channel + background workers
builder.Services.AddSingleton<OutboxChannel>();
builder.Services.AddHostedService<OutboxWorker>();
builder.Services.AddHostedService<BroadcastConsumer>();

// WS Gateway client for Outbox broadcast — simple retry, no circuit breaker needed
// (BroadcastConsumer retries at application level via OutboxWorker stale-threshold)
builder.Services.AddHttpClient<WsGatewayClient>(c => c.BaseAddress = new Uri(wsGatewayUrl))
    .AddResilienceHandler("ws-gateway", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(300),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(5));
    });

builder.Services.AddScoped<CreateMessageHandler>();

// Аутентификация: проверка JWT access-токенов, выпущенных Zitadel.
var zitadelAuthority = builder.Configuration["Zitadel:Authority"] ?? throw new InvalidOperationException("Zitadel:Authority is not configured");
var zitadelMetadata = builder.Configuration["Zitadel:MetadataAddress"] ?? throw new InvalidOperationException("Zitadel:MetadataAddress is not configured");
var zitadelProjectId = builder.Configuration["Zitadel:ProjectId"];
var swaggerClientId = builder.Configuration["Zitadel:SwaggerClientId"];

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = zitadelAuthority;
        o.MetadataAddress = zitadelMetadata;
        o.RequireHttpsMetadata = false;
        // Discovery doc возвращает jwks_uri с внешним hostname (http://localhost:8080/...).
        // Изнутри Docker-контейнера localhost - это сам контейнер, а не nginx -> Connection refused.
        // Handler перенаправляет все backchannel-запросы на внутренний zitadel-api
        // и проставляет Host: localhost:8080, чтобы Zitadel нашёл нужный инстанс.
        o.BackchannelHttpHandler = new ZitadelBackchannelHandler(
            externalBase: zitadelAuthority,
            internalBase: new Uri(zitadelMetadata).GetLeftPart(UriPartial.Authority));
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = zitadelAuthority,
            ValidateAudience = !string.IsNullOrEmpty(zitadelProjectId),
            ValidAudiences = string.IsNullOrEmpty(zitadelProjectId)
                ? null
                : new[] { zitadelProjectId },
            ValidateLifetime = true,
            NameClaimType = "preferred_username",
        };
    });

builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build());

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Messaging Service",
        Version = "v1",
        Description = "Хранение сообщений, Outbox Pattern, идемпотентность."
    });
    c.AddServer(new OpenApiServer { Url = "/api", Description = "Через Nginx (unified)" });
    c.AddServer(new OpenApiServer { Url = "/", Description = "Прямой доступ к сервису" });
    c.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);

    var xmlPath = Path.Combine(AppContext.BaseDirectory, "NexTalk.Messaging.Service.xml");
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri($"{zitadelAuthority}/oauth/v2/authorize"),
                TokenUrl = new Uri($"{zitadelAuthority}/oauth/v2/token"),
                Scopes = new Dictionary<string, string>
                {
                    { "openid", "OpenID" },
                    { "profile", "Profile" },
                    { "email", "Email" },
                    { "offline_access", "Refresh token" }
                }
            }
        }
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "oauth2"
                }
            },
            ["openid", "profile", "email"]
        }
    });
});

builder.Services.AddHealthChecks()
    .AddNpgSql(pgConnectionString, tags: ["ready"]);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.OAuthClientId(swaggerClientId);
        c.OAuthScopes("openid", "profile", "email");
        c.OAuthUsePkce();
        c.SwaggerEndpoint("v1/swagger.json", "Messaging Service v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "Messaging Service API";
    });

    MigrateDatabase(app);
}

app.UseForwardedHeaders();
app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(exApp => exApp.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, message) = ex switch
    {
        NotFoundException e => (StatusCodes.Status404NotFound, e.Message),
        ForbiddenException e => (StatusCodes.Status403Forbidden, e.Message),
        BadRequestException e => (StatusCodes.Status400BadRequest, e.Message),
        _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.")
    };
    ctx.Response.StatusCode = status;
    await ctx.Response.WriteAsJsonAsync(new { error = message });
}));

app.UseMiddleware<DeadlineMiddleware>();

app.UseHttpMetrics();

app.UseSerilogRequestLogging(opts =>
    opts.EnrichDiagnosticContext = (dc, ctx) =>
        dc.Set("CorrelationId",
            ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
            ?? ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? ctx.TraceIdentifier));

// Internal endpoints
CreateMessageEndpoint.Map(app);

app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false })
    .AllowAnonymous();
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous();
app.MapMetrics().AllowAnonymous();

app.Run();

static void MigrateDatabase(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();

    if (!db.Database.IsRelational())
        return;

    if (db.Database.GetPendingMigrations().Any())
        db.Database.Migrate();
}

file sealed class ZitadelBackchannelHandler(string externalBase, string internalBase) : HttpClientHandler
{
    private readonly string _ext = externalBase.TrimEnd('/');
    private readonly string _int = internalBase.TrimEnd('/');
    private readonly string _host = new Uri(externalBase).Authority;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
    {
        var uri = req.RequestUri!.ToString();
        if (uri.StartsWith(_ext, StringComparison.OrdinalIgnoreCase))
            req.RequestUri = new Uri(_int + uri[_ext.Length..]);
        req.Headers.Host = _host;
        return base.SendAsync(req, ct);
    }
}
