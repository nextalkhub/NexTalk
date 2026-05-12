using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Http.Resilience;
using NextTalk.Websocket.Gateway.Features.Broadcast;
using NextTalk.Websocket.Gateway.Features.Chat.SendMessage;
using NextTalk.Websocket.Gateway.Features.Disconnect;
using NextTalk.Websocket.Gateway.Infrastructure;
using NextTalk.Websocket.Gateway.Shared;
using Polly;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration));

builder.Services.Configure<PresenceOptions>(builder.Configuration.GetSection("Presence"));

// JWT Bearer - извлекает userId из claim sub в JWT, выданном Zitadel и валидирует его.
// Для SignalR-подключений токен передается как /..?access_token=.
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Zitadel:Authority"];
        options.MetadataAddress = builder.Configuration["Zitadel:MetadataAddress"]!;
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters.ValidateAudience = false;
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) &&
                    context.Request.Path.StartsWithSegments("/ws/chat"))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// SignalR - userId маппинг из JWT через SubClaimUserIdProvider
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, SubClaimUserIdProvider>();

// Состояние присутствия (in-memory)
builder.Services.AddSingleton<ConnectionManager>();
builder.Services.AddSingleton<PresenceTracker>();
builder.Services.AddHostedService<PresenceMonitor>();

// Обработчик (transient, т.к ChatHub - transient (создается на каждый запрос), handler stateless)
builder.Services.AddTransient<SendMessageHandler>();

// HTTP-клиенты - отказоустойчивость через Polly
var guildUrl = builder.Configuration["Services:GuildService"]!;
var messagingUrl = builder.Configuration["Services:MessagingService"]!;

builder.Services.AddHttpClient<GuildServiceClient>(c =>
    c.BaseAddress = new Uri(guildUrl))
    .AddResilienceHandler("guild", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions()
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true
        });
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions()
        {
            SamplingDuration = TimeSpan.FromSeconds(30),
            FailureRatio = 0.5,
            MinimumThroughput = 5,
            BreakDuration = TimeSpan.FromSeconds(15)
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });
    
builder.Services.AddHttpClient<MessagingServiceClient>(c =>
    c.BaseAddress = new Uri(messagingUrl))
    .AddResilienceHandler("messaging", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true
        });
        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            SamplingDuration = TimeSpan.FromSeconds(30),
            FailureRatio = 0.5,
            MinimumThroughput = 5,
            BreakDuration = TimeSpan.FromSeconds(15)
        });
        pipeline.AddTimeout(TimeSpan.FromSeconds(2));
    });

// Health checks
builder.Services.AddHealthChecks()
    .AddUrlGroup(new Uri($"{guildUrl}/healthz"), name: "guild-service", tags: ["ready"])
    .AddUrlGroup(new Uri($"{messagingUrl}/healthz"), name: "messaging-service", tags: ["ready"]);

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// Сбор HTTP-метрик для Prometheus
app.UseHttpMetrics();

app.UseSerilogRequestLogging(options =>
    options.EnrichDiagnosticContext = (dc, context) =>
        dc.Set("CorrelationId",
            context.Request.Headers["X-Request-Id"].FirstOrDefault()
            ?? context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? context.TraceIdentifier));

// Liveness probe - всегда 200. Нужен для проверки, что процесс жив
app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false });

// Readiness probes: 200 только если сетевые зависимости доступны
app.MapHealthChecks("/readyz", new HealthCheckOptions 
{
    Predicate = check => check.Tags.Contains("ready")
});

// Отдает метрики в формате Prometheus через /metrics
app.MapMetrics();

// Internal эндпоинты
BroadcastEndpoints.Map(app);
DisconnectEndpoints.Map(app);

// SignalR hub
app.MapHub<ChatHub>("/ws/chat");

app.Run();
