using System.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using NexTalk.Voice.Service.Features.Internal.DisconnectChannel;
using NexTalk.Voice.Service.Features.Internal.DisconnectUser;
using NexTalk.Voice.Service.Features.Voice.Join;
using NexTalk.Voice.Service.Features.Voice.Leave;
using NexTalk.Voice.Service.Infrastructure;
using NexTalk.Voice.Service.Shared;
using NexTalk.Voice.Service.Shared.Exceptions;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Prometheus;
using Serilog;
using Serilog.Enrichers.Span;
using StackExchange.Redis;
using IPNetwork = System.Net.IPNetwork;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("/zitadel-config/swagger-config.json", optional: true, reloadOnChange: true);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration).Enrich.WithSpan());

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(
            serviceName: "voice-service",
            serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation(opts =>
        {
            opts.RecordException = true;
            opts.Filter = ctx =>
                !ctx.Request.Path.StartsWithSegments("/metrics") &&
                !ctx.Request.Path.StartsWithSegments("/healthz") &&
                !ctx.Request.Path.StartsWithSegments("/readyz");
        })
        .AddHttpClientInstrumentation()
        .AddOtlpExporter());

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
});

var zitadelAuthority = builder.Configuration["Zitadel:Authority"] ?? throw new InvalidOperationException("Zitadel:Authority не задан.");
var zitadelMetadata = builder.Configuration["Zitadel:MetadataAddress"] ?? throw new InvalidOperationException("Zitadel:MetadataAddress не задан.");
var zitadelProjectId = builder.Configuration["Zitadel:ProjectId"];
var swaggerClientId = builder.Configuration["Zitadel:SwaggerClientId"];

var guildUrl = builder.Configuration["Services:GuildService"] ?? throw new InvalidOperationException("Services:GuildService не задан.");
var wsGatewayUrl = builder.Configuration["Services:WebSocketGateway"] ?? throw new InvalidOperationException("Services:WebSocketGateway не задан.");

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? throw new InvalidOperationException("ConnectionStrings:Redis не задан.");
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(redisConnectionString));
builder.Services.AddSingleton<ISessionStore, RedisSessionStore>();
builder.Services.AddSingleton<LiveKitTokenGenerator>();
builder.Services.AddSingleton<LiveKitRoomClient>();

// DeadlineForwardingHandler добавляет X-Deadline к каждому запросу в Guild Service.
builder.Services.AddTransient<DeadlineForwardingHandler>();

// HTTP-клиент к Guild Service
builder.Services.AddHttpClient<GuildServiceClient>(c => c.BaseAddress = new Uri(guildUrl))
    .AddHttpMessageHandler<DeadlineForwardingHandler>()
    .AddResilienceHandler("guild", (pipeline, ctx) =>
    {
        var logger = ctx.ServiceProvider.GetRequiredService<ILogger<Program>>();
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
            OnRetry = args =>
            {
                logger.LogWarning(args.Outcome.Exception, "Retry {Attempt}/3 guild-service: {Status}",
                    args.AttemptNumber + 1, args.Outcome.Result?.StatusCode);
                return ValueTask.CompletedTask;
            }
        });
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            SamplingDuration = TimeSpan.FromSeconds(30),
            FailureRatio = 0.5,
            MinimumThroughput = 5,
            BreakDuration = TimeSpan.FromSeconds(15),
            OnOpened = args =>
            {
                logger.LogError(args.Outcome.Exception, "Circuit breaker opened guild-service for {Duration}s: {Status}",
                    args.BreakDuration.TotalSeconds, args.Outcome.Result?.StatusCode);
                return ValueTask.CompletedTask;
            },
            OnClosed = _ =>
            {
                logger.LogInformation("Circuit breaker closed guild-service");
                return ValueTask.CompletedTask;
            }
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });

// HTTP-клиент к WS Gateway
builder.Services.AddHttpClient<WsGatewayClient>(c => c.BaseAddress = new Uri(wsGatewayUrl))
    .AddResilienceHandler("ws-gateway", (pipeline, ctx) =>
    {
        var logger = ctx.ServiceProvider.GetRequiredService<ILogger<Program>>();
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(300),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
            OnRetry = args =>
            {
                logger.LogWarning(args.Outcome.Exception, "Retry {Attempt}/3 ws-gateway: {Status}",
                    args.AttemptNumber + 1, args.Outcome.Result?.StatusCode);
                return ValueTask.CompletedTask;
            }
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(5));
    });

// Feature-хендлеры.
builder.Services.AddScoped<JoinVoiceHandler>();
builder.Services.AddScoped<LeaveVoiceHandler>();

// Аутентификация: JWT-токены Zitadel.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = zitadelAuthority;
        o.MetadataAddress = zitadelMetadata;
        o.RequireHttpsMetadata = false;
        // Discovery doc возвращает jwks_uri с внешним hostname.
        // Handler перенаправляет backchannel-запросы на внутренний адрес Zitadel.
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

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<NexTalk.Voice.Service.Shared.ZitadelUserInfoService>();
builder.Services.AddTransient<Microsoft.AspNetCore.Authentication.IClaimsTransformation,
    NexTalk.Voice.Service.Shared.ZitadelClaimsEnricher>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Voice Service",
        Version = "v1",
        Description = "Управление голосовыми каналами через LiveKit SFU.\n\n" +
                      "**Формат ошибок:** все 4xx/5xx возвращают `{ \"error\": \"сообщение\" }`.",
    });
    c.AddServer(new OpenApiServer { Url = "/api", Description = "Через Nginx (unified)" });
    c.AddServer(new OpenApiServer { Url = "/",    Description = "Прямой доступ к сервису" });
    c.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
    c.OperationFilter<ParameterDocFilter>();

    var xmlPath = Path.Combine(AppContext.BaseDirectory, "NexTalk.Voice.Service.xml");
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
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
                    { "offline_access", "Refresh token" },
                },
            }
        }
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "oauth2" }
            },
            ["openid", "profile", "email"]
        }
    });
});

var livekitUrl = builder.Configuration["LiveKit:Url"]
    ?? throw new InvalidOperationException("LiveKit:Url не задан.");

builder.Services.AddHealthChecks()
    .AddUrlGroup(new Uri(livekitUrl), name: "livekit", tags: ["ready"])
    .AddUrlGroup(new Uri($"{guildUrl}/healthz"), name: "guild-service", tags: ["ready"]);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.OAuthClientId(swaggerClientId);
        c.OAuthScopes("openid", "profile", "email");
        c.OAuthUsePkce();
        c.SwaggerEndpoint("v1/swagger.json", "Voice Service v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "Voice Service API";
    });
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
        _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred."),
    };

    if (status == StatusCodes.Status500InternalServerError)
        ctx.RequestServices.GetRequiredService<ILogger<Program>>()
            .LogError(ex, "Unhandled exception: {Path}", ctx.Request.Path);

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

// Публичные эндпоинты (требуют JWT).
JoinVoiceEndpoint.Map(app);
LeaveVoiceEndpoint.Map(app);

// Internal-эндпоинты (сетевой trust, без JWT).
DisconnectUserEndpoint.Map(app);
DisconnectChannelEndpoint.Map(app);

app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false })
    .AllowAnonymous();
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous();
app.MapMetrics().AllowAnonymous();

app.Run();

internal sealed record ParameterDoc(params (string Name, string Description)[] Params);

internal sealed class ParameterDocFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var docs = context.ApiDescription.ActionDescriptor.EndpointMetadata
            .OfType<ParameterDoc>()
            .SelectMany(d => d.Params);

        foreach (var (name, desc) in docs)
        {
            var p = operation.Parameters?.FirstOrDefault(
                x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase));
            if (p is not null)
                p.Description = desc;
        }
    }
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
