using System.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NextTalk.Websocket.Gateway.Features.Broadcast;
using NextTalk.Websocket.Gateway.Features.Chat.SendMessage;
using NextTalk.Websocket.Gateway.Features.Disconnect;
using NextTalk.Websocket.Gateway.Infrastructure;
using NextTalk.Websocket.Gateway.Shared;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Polly;
using Prometheus;
using Prometheus.DotNetRuntime;
using Serilog;
using Serilog.Enrichers.Span;
using StackExchange.Redis;
using IPNetwork = System.Net.IPNetwork;

try { DotNetRuntimeStatsBuilder.Customize().StartCollecting(); } catch (InvalidOperationException) { }

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("/zitadel-config/swagger-config.json", optional: true, reloadOnChange: true);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration).Enrich.WithSpan());

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(
            serviceName: "websocket-gateway",
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

builder.Services.Configure<PresenceOptions>(builder.Configuration.GetSection("Presence"));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    options.KnownIPNetworks.Add(new IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
});

var zitadelAuthority = builder.Configuration["Zitadel:Authority"] ?? throw new InvalidOperationException("Zitadel:Authority is not configured");
var zitadelMetadata = builder.Configuration["Zitadel:MetadataAddress"] ?? throw new InvalidOperationException("Zitadel:MetadataAddress is not configured");
var zitadelProjectId = builder.Configuration["Zitadel:ProjectId"];
var swaggerClientId = builder.Configuration["Zitadel:SwaggerClientId"];

// JWT Bearer. SignalR-подключения передают токен через ?access_token= т.к. браузер
// не поддерживает кастомные заголовки при WS-handshake.
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.Authority = zitadelAuthority;
        o.MetadataAddress = zitadelMetadata;
        o.RequireHttpsMetadata = false;
        // Discovery doc возвращает jwks_uri с внешним hostname (http://localhost:8080/...).
        // Изнутри Docker-контейнера localhost - это сам контейнер, а не nginx, поэтому Connection refused.
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
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build());

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<NextTalk.Websocket.Gateway.Shared.ZitadelUserInfoService>();
builder.Services.AddTransient<Microsoft.AspNetCore.Authentication.IClaimsTransformation,
    NextTalk.Websocket.Gateway.Shared.ZitadelClaimsEnricher>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WebSocket Gateway",
        Version = "v1",
        Description = "SignalR Hub для real-time коммуникации: сообщения, presence, события."
    });
    c.AddServer(new OpenApiServer { Url = "/api", Description = "Через Nginx (unified)" });
    c.AddServer(new OpenApiServer { Url = "/",    Description = "Прямой доступ к сервису" });
    c.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);

    var xmlPath = Path.Combine(AppContext.BaseDirectory, "NextTalk.Websocket.Gateway.xml");
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

// Redis - ленивая фабрика: ConnectionMultiplexer создается при первом resolve.
// Это позволяет тестам подменить IConnectionMultiplexer / IConnectionManager до того,
// как соединение с Redis будет реально установлено.
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(
        builder.Configuration.GetConnectionString("Redis")
        ?? throw new InvalidOperationException("ConnectionStrings:Redis is not configured")));

// SignalR - userId маппинг из JWT sub claim через SubClaimUserIdProvider.
// Redis backplane подключается так же лениво - строка читается только при resolve.
builder.Services.AddSingleton<UserIdHubFilter>();
builder.Services.AddSignalR(o => o.AddFilter<UserIdHubFilter>())
    .AddStackExchangeRedis(builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379");
builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();

// Presence state (Redis-backed, shared across replicas)
builder.Services.AddSingleton<IConnectionManager, RedisConnectionManager>();
builder.Services.AddSingleton<IPresenceTracker, RedisPresenceTracker>();
builder.Services.AddHostedService<PresenceMonitor>();

// DAU/WAU/MAU: уникальные пользователи через Redis sorted set
builder.Services.AddSingleton<UserActivityService>();
builder.Services.AddSingleton<IUserActivityService>(sp => sp.GetRequiredService<UserActivityService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<UserActivityService>());

// ChatHub is transient (one instance per connection), handler must be stateless
builder.Services.AddTransient<SendMessageHandler>();

// HTTP clients - resilience via Polly
var guildUrl = builder.Configuration["Services:GuildService"] ?? throw new InvalidOperationException("Services:GuildService is not configured");
var messagingUrl = builder.Configuration["Services:MessagingService"] ?? throw new InvalidOperationException("Services:MessagingService is not configured");

builder.Services.AddHttpClient<GuildServiceClient>(c =>
    c.BaseAddress = new Uri(guildUrl))
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

builder.Services.AddHttpClient<MessagingServiceClient>(c =>
    c.BaseAddress = new Uri(messagingUrl))
    .AddResilienceHandler("messaging", (pipeline, ctx) =>
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
                logger.LogWarning(args.Outcome.Exception, "Retry {Attempt}/3 messaging-service: {Status}",
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
                logger.LogError(args.Outcome.Exception, "Circuit breaker opened messaging-service for {Duration}s: {Status}",
                    args.BreakDuration.TotalSeconds, args.Outcome.Result?.StatusCode);
                return ValueTask.CompletedTask;
            },
            OnClosed = _ =>
            {
                logger.LogInformation("Circuit breaker closed messaging-service");
                return ValueTask.CompletedTask;
            }
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });

builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.OAuthClientId(swaggerClientId);
        c.OAuthScopes("openid", "profile", "email");
        c.OAuthUsePkce();
        c.SwaggerEndpoint("v1/swagger.json", "WebSocket Gateway v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "WebSocket Gateway API";
    });
}

app.UseForwardedHeaders();
app.UseAuthentication();
app.UseAuthorization();

app.UseExceptionHandler(exApp => exApp.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    ctx.RequestServices.GetRequiredService<ILogger<Program>>()
        .LogError(ex, "Unhandled exception: {Path}", ctx.Request.Path);
    ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await ctx.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
}));

app.UseMiddleware<DeadlineMiddleware>();

app.UseHttpMetrics();

app.UseSerilogRequestLogging(opts =>
    opts.EnrichDiagnosticContext = (dc, ctx) =>
    {
        dc.Set("CorrelationId",
            ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
            ?? ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? ctx.TraceIdentifier);
        dc.Set("UserId", ctx.User?.FindFirst("sub")?.Value ?? "");
    });

app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false })
    .AllowAnonymous();
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
}).AllowAnonymous();
app.MapMetrics().AllowAnonymous();

// Internal endpoints - accessible only within Docker/k8s network (nginx denies /internal externally)
BroadcastEndpoints.Map(app);
DisconnectEndpoints.Map(app);

app.MapHub<ChatHub>("/hubs/chat");

// Принудительная инициализация - метрики регистрируются сразу, не дожидаясь первого события.
_ = NexTalkMetrics.ActiveConnections;
_ = NexTalkMetrics.DailyActiveUsers;
_ = NexTalkMetrics.WeeklyActiveUsers;
_ = NexTalkMetrics.MonthlyActiveUsers;

app.Run();

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
