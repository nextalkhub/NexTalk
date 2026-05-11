using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using NexTalk.Guild.Service.Features.Channels.CreateChannel;
using NexTalk.Guild.Service.Features.Channels.DeleteChannel;
using NexTalk.Guild.Service.Features.Channels.GetChannels;
using NexTalk.Guild.Service.Features.Guilds.CreateGuild;
using NexTalk.Guild.Service.Features.Guilds.DeleteGuild;
using NexTalk.Guild.Service.Features.Guilds.GetUserGuilds;
using NexTalk.Guild.Service.Features.Internal.CheckAccess;
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
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration));

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")!;
var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection")!;

builder.Services.AddStackExchangeRedisCache(opts =>
{
    opts.Configuration = redisConnectionString;
    opts.InstanceName = "nextalk:";
});

builder.Services.AddDbContext<GuildDbContext>(opts =>
    opts.UseNpgsql(pgConnectionString));

builder.Services.AddHttpClient<WsGatewayClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["WsGateway:BaseUrl"]!));

builder.Services.AddHttpClient<VoiceServiceClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["VoiceService:BaseUrl"]!));

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
builder.Services.AddScoped<CheckAccessHandler>();
builder.Services.AddScoped<GetGuildMembersHandler>();
builder.Services.AddScoped<GetUserGuildsInternalHandler>();

builder.Services.AddHealthChecks()
    .AddNpgSql(pgConnectionString, tags: ["ready"])
    .AddRedis(redisConnectionString, tags: ["ready"]);

var app = builder.Build();

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

// Internal endpoints
CheckAccessEndpoint.Map(app);
GetGuildMembersEndpoint.Map(app);
GetUserGuildsInternalEndpoint.Map(app);

app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapMetrics();

// multiple guild-service replicas share the same Redis db=1.
//
// Positive case (cache hit):  key exists → returns cached value from Redis.
// Negative case (cache miss): key absent → origin computes value, stores in Redis,
//                              next request (even on another pod) gets cache hit.
app.MapGet("/api/guilds/probe", async (IDistributedCache cache, ILogger<Program> logger) =>
{
    const string key = "guild:probe";

    var cached = await cache.GetStringAsync(key);
    if (cached is not null)
    {
        logger.LogInformation("Cache hit for key {Key}: {Value}", key, cached);
        return Results.Ok(new { source = "cache", value = cached });
    }

    var value = $"set by {Environment.MachineName} at {DateTime.UtcNow:O}";
    await cache.SetStringAsync(key, value, new DistributedCacheEntryOptions
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
    });

    logger.LogInformation("Cache miss for key {Key}, stored by {Instance}", key, Environment.MachineName);
    return Results.Ok(new { source = "origin", value });
});


app.Run();
