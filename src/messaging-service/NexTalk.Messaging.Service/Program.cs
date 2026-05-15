using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using NexTalk.Messaging.Service.Features.Messages.GetMessages;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration));

var zitadelAuthority = builder.Configuration["Zitadel:Authority"]!;
var zitadelMetadata = builder.Configuration["Zitadel:MetadataAddress"]!;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.Authority = zitadelAuthority;
        opts.MetadataAddress = zitadelMetadata;
        opts.RequireHttpsMetadata = false;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = zitadelAuthority,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(5)
        };
    });

builder.Services.AddAuthorization();

var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection")!;

builder.Services.AddDbContext<MessagingDbContext>(opts =>
    opts.UseNpgsql(pgConnectionString));

builder.Services.AddHttpContextAccessor();

// HTTP client to Guild Service with resilience: timeout + circuit breaker.
// Microsoft.Extensions.Http.Resilience is the modern replacement for Polly extensions —
// uses Polly v8 under the hood and provides the standard pipeline out of the box.
builder.Services.AddHttpClient<IGuildServiceClient, GuildServiceClient>(c =>
        c.BaseAddress = new Uri(builder.Configuration["GuildService:BaseUrl"]!))
    .AddStandardResilienceHandler(opts =>
    {
        opts.AttemptTimeout.Timeout = TimeSpan.FromSeconds(3);
        opts.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
        opts.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
    });

builder.Services.AddScoped<GetMessagesHandler>();

builder.Services.AddHealthChecks()
    .AddNpgSql(pgConnectionString, tags: ["ready"]);

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
app.UseAuthentication();
app.UseAuthorization();

// Propagate JWT "sub" claim as X-User-Id so endpoints can bind [FromHeader] Guid userId.
app.Use(async (ctx, next) =>
{
    if (ctx.User.Identity?.IsAuthenticated == true)
    {
        var sub = ctx.User.FindFirst("sub")?.Value
            ?? ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (sub is not null) ctx.Request.Headers["X-User-Id"] = sub;
    }
    await next();
});

app.UseSerilogRequestLogging(opts =>
    opts.EnrichDiagnosticContext = (dc, ctx) =>
        dc.Set("CorrelationId",
            ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
            ?? ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? ctx.TraceIdentifier));

// All business endpoints require a valid JWT.
var api = app.MapGroup("").RequireAuthorization();
GetMessagesEndpoint.Map(api);

app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/readyz", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapMetrics();

app.Run();

public partial class Program;
