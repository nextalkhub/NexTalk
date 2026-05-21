using System.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NexTalk.Guild.Service.Features.Channels.CreateChannel;
using NexTalk.Guild.Service.Features.Channels.DeleteChannel;
using NexTalk.Guild.Service.Features.Channels.GetChannels;
using NexTalk.Guild.Service.Features.Guilds.CreateGuild;
using NexTalk.Guild.Service.Features.Guilds.DeleteGuild;
using NexTalk.Guild.Service.Features.Guilds.GetUserGuilds;
using NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;
using NexTalk.Guild.Service.Features.Internal.GetGuildMembers;
using NexTalk.Guild.Service.Features.Internal.GetUserGuildsInternal;
using NexTalk.Guild.Service.Features.Invites.AcceptInvite;
using NexTalk.Guild.Service.Features.Invites.CreateInvite;
using NexTalk.Guild.Service.Features.Members.AssignRole;
using NexTalk.Guild.Service.Features.Members.BanMember;
using NexTalk.Guild.Service.Features.Members.GetMembers;
using NexTalk.Guild.Service.Features.Members.KickMember;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Prometheus;
using Serilog;
using Serilog.Enrichers.Span;
using Swashbuckle.AspNetCore.SwaggerGen;
using IPNetwork = System.Net.IPNetwork;

var builder = WebApplication.CreateBuilder(args);

// Результат работы bootstrap'а: projectId и client ID'ы, созданные контейнером zitadel-bootstrap.
// Файл появляется как только bootstrap завершается; мы зависим от него в docker-compose.
// Плоские ключи ("projectId" и др.) читаются единым Swagger UI напрямую.
// Вложенный объект "Zitadel" используется здесь через IConfiguration -> Zitadel:ProjectId и т.д.
builder.Configuration.AddJsonFile("/zitadel-config/swagger-config.json", optional: true, reloadOnChange: true);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration).Enrich.WithSpan());

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(
            serviceName: "guild-service",
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
        .AddEntityFrameworkCoreInstrumentation()
        .AddOtlpExporter());

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
});

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")!;
var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection")!;

builder.Services.AddStackExchangeRedisCache(opts =>
{
    opts.Configuration = redisConnectionString;
    opts.InstanceName = "nextalk:";
});

builder.Services.AddDbContext<GuildDbContext>(opts =>
    opts.UseNpgsql(pgConnectionString).UseSnakeCaseNamingConvention());

builder.Services.AddTransient<DeadlineForwardingHandler>();

builder.Services.AddHttpClient<WsGatewayClient>(c =>
        c.BaseAddress = new Uri(builder.Configuration["Services:WebSocketGateway"] ?? throw new InvalidOperationException("Services:WebSocketGateway is not configured")))
    .AddHttpMessageHandler<DeadlineForwardingHandler>()
    .AddResilienceHandler("ws-gateway", (pipeline, ctx) =>
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
                logger.LogWarning(args.Outcome.Exception, "Retry {Attempt}/3 ws-gateway: {Status}",
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
                logger.LogError(args.Outcome.Exception, "Circuit breaker opened ws-gateway for {Duration}s: {Status}",
                    args.BreakDuration.TotalSeconds, args.Outcome.Result?.StatusCode);
                return ValueTask.CompletedTask;
            },
            OnClosed = _ =>
            {
                logger.LogInformation("Circuit breaker closed ws-gateway");
                return ValueTask.CompletedTask;
            }
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });

builder.Services.AddHttpClient<VoiceServiceClient>(c =>
        c.BaseAddress = new Uri(builder.Configuration["Services:VoiceService"] ?? throw new InvalidOperationException("Services:VoiceService is not configured")))
    .AddHttpMessageHandler<DeadlineForwardingHandler>()
    .AddResilienceHandler("voice", (pipeline, ctx) =>
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
                logger.LogWarning(args.Outcome.Exception, "Retry {Attempt}/3 voice-service: {Status}",
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
                logger.LogError(args.Outcome.Exception, "Circuit breaker opened voice-service for {Duration}s: {Status}",
                    args.BreakDuration.TotalSeconds, args.Outcome.Result?.StatusCode);
                return ValueTask.CompletedTask;
            },
            OnClosed = _ =>
            {
                logger.LogInformation("Circuit breaker closed voice-service");
                return ValueTask.CompletedTask;
            }
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });

builder.Services.AddScoped<RbacService>();

// Guild handlers
builder.Services.AddScoped<CreateGuildHandler>();
builder.Services.AddScoped<GetUserGuildsHandler>();
builder.Services.AddScoped<DeleteGuildHandler>();

// Channel handlers
builder.Services.AddScoped<CreateChannelHandler>();
builder.Services.AddScoped<DeleteChannelHandler>();
builder.Services.AddScoped<GetChannelsHandler>();

// Invite handlers
builder.Services.AddScoped<IInviteRepository, InviteRepository>();
builder.Services.AddScoped<CreateInviteHandler>();
builder.Services.AddScoped<AcceptInviteHandler>();

// Member handlers
builder.Services.AddScoped<GetMembersHandler>();
builder.Services.AddScoped<AssignRoleHandler>();
builder.Services.AddScoped<KickMemberHandler>();
builder.Services.AddScoped<BanMemberHandler>();

// Internal handlers
builder.Services.AddScoped<CheckChannelAccessHandler>();
builder.Services.AddScoped<GetGuildMembersHandler>();
builder.Services.AddScoped<GetUserGuildsInternalHandler>();

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
        // Изнутри Docker-контейнера localhost - это сам контейнер, а не nginx → Connection refused.
        // Handler перенаправляет все backchannel-запросы на внутренний zitadel-api
        // и проставляет Host: localhost:8080, чтобы Zitadel нашел нужный инстанс.
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

// По умолчанию каждый эндпоинт требует аутентифицированного пользователя
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build());

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<NexTalk.Guild.Service.Shared.ZitadelUserInfoService>();
builder.Services.AddTransient<Microsoft.AspNetCore.Authentication.IClaimsTransformation,
    NexTalk.Guild.Service.Shared.ZitadelClaimsEnricher>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Guild Service",
        Version = "v1",
        Description = "Управление серверами (гильдиями), каналами, участниками и приглашениями.\n\n" +
                      "**Формат ошибок:** все 4xx/5xx возвращают `{ \"error\": \"сообщение\" }`."
    });
    c.AddServer(new OpenApiServer { Url = "/api", Description = "Через Nginx" });
    c.AddServer(new OpenApiServer { Url = "/",    Description = "Прямой доступ к сервису" });
    c.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
    c.DocumentFilter<ExcludeNonPublicEndpointsFilter>();
    c.OperationFilter<ParameterDocFilter>();

    var xmlPath = Path.Combine(AppContext.BaseDirectory, "NexTalk.Guild.Service.xml");
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
    .AddNpgSql(pgConnectionString, tags: ["ready"])
    .AddRedis(redisConnectionString, tags: ["ready"]);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.OAuthClientId(swaggerClientId);
        c.OAuthScopes("openid", "profile", "email");
        c.OAuthUsePkce();
        c.SwaggerEndpoint("v1/swagger.json", "Guild Service v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "Guild Service API";
    });

    MigrateDatabase(app);
}

app.UseForwardedHeaders();
app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(exApp => exApp.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, message) =
        ex is NotFoundException ? (StatusCodes.Status404NotFound, ex.Message) :
        ex is ForbiddenException ? (StatusCodes.Status403Forbidden, ex.Message) :
        ex is BadRequestException ? (StatusCodes.Status400BadRequest, ex.Message) :
        (StatusCodes.Status500InternalServerError, "An unexpected error occurred.");

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

// Guild endpoints
CreateGuildEndpoint.Map(app);
GetUserGuildsEndpoint.Map(app);
DeleteGuildEndpoint.Map(app);

// Channel endpoints
CreateChannelEndpoint.Map(app);
DeleteChannelEndpoint.Map(app);
GetChannelsEndpoint.Map(app);

// Invite endpoints
CreateInviteEndpoint.Map(app);
AcceptInviteEndpoint.Map(app);

// Member endpoints
GetMembersEndpoint.Map(app);
AssignRoleEndpoint.Map(app);
KickMemberEndpoint.Map(app);
BanMemberEndpoint.Map(app);

// Internal-эндпоинты
var internalEndpoints = app.MapGroup("").AllowAnonymous();
CheckChannelAccessEndpoint.Map(internalEndpoints);
GetGuildMembersEndpoint.Map(internalEndpoints);
GetUserGuildsInternalEndpoint.Map(internalEndpoints);

app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false })
    .AllowAnonymous();
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous();
app.MapMetrics().AllowAnonymous();

// multiple guild-service replicas share the same Redis db=1.
//
// Positive case (cache hit):  key exists → returns cached value from Redis.
// Negative case (cache miss): key absent → origin computes value, stores in Redis,
//                              next request (even on another pod) gets cache hit.
app.MapGet("/guilds/probe", async (IDistributedCache cache, ILogger<Program> logger) =>
{
    const string key = "guild:probe";

    var cached = await cache.GetStringAsync(key);
    if (cached is not null)
    {
        logger.LogInformation("Cache hit for key {Key}: {Value}", key, cached);
        return Results.Ok(new { source = "cache", value = cached });
    }

    var value = $"set by {Environment.MachineName} at {DateTimeOffset.UtcNow:O}";
    await cache.SetStringAsync(key, value, new DistributedCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
    });

    logger.LogInformation("Cache miss for key {Key}, stored by {Instance}", key, Environment.MachineName);
    return Results.Ok(new { source = "origin", value });
}).ExcludeFromDescription().AllowAnonymous();


app.Run();

static void MigrateDatabase(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
    
    if (!dbContext.Database.IsRelational())
        return;

    if (dbContext.Database.GetPendingMigrations().Any())
        dbContext.Database.Migrate();
}

internal sealed class ExcludeNonPublicEndpointsFilter : IDocumentFilter
{
    private static readonly string[] ExcludedPrefixes =
        ["/internal", "/metrics", "/healthz", "/readyz", "/guilds/probe"];

    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        var toRemove = swaggerDoc.Paths.Keys
            .Where(p => ExcludedPrefixes.Any(prefix => p.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        foreach (var path in toRemove)
            swaggerDoc.Paths.Remove(path);
    }
}

/// <summary>Описания параметров эндпоинта для Swagger.</summary>
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
