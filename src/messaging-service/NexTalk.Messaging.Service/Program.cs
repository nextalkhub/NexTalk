using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Features.Messages.DeleteMessage;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;
using Prometheus;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSerilog((_, lc) => lc.ReadFrom.Configuration(builder.Configuration));

var pgConnectionString = builder.Configuration.GetConnectionString("PostgresConnection")!;

builder.Services.AddDbContext<MessagingDbContext>(opts =>
    opts.UseNpgsql(pgConnectionString));

builder.Services.AddHttpClient<WsGatewayClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["WsGateway:BaseUrl"]!));

builder.Services.AddHttpClient<GuildServiceClient>(c =>
    c.BaseAddress = new Uri(builder.Configuration["GuildService:BaseUrl"]!));

builder.Services.AddScoped<DeleteMessageHandler>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

if (!builder.Environment.IsEnvironment("Test"))
{
    builder.Services.AddHealthChecks()
        .AddNpgSql(pgConnectionString, tags: ["ready"]);
}
else
{
    builder.Services.AddHealthChecks();
}

var app = builder.Build();

app.UseExceptionHandler(exApp => exApp.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, message) =
        ex is NotFoundException ? (StatusCodes.Status404NotFound, ex.Message) :
        ex is ForbiddenException ? (StatusCodes.Status403Forbidden, ex.Message) :
        ex is BadRequestException ? (StatusCodes.Status400BadRequest, ex.Message) :
        (StatusCodes.Status500InternalServerError, "An unexpected error occurred.");

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

DeleteMessageEndpoint.Map(app);

if (!app.Environment.IsEnvironment("Test"))
{
    app.MapHealthChecks("/healthz", new HealthCheckOptions { Predicate = _ => false });
    app.MapHealthChecks("/readyz", new HealthCheckOptions
    {
        Predicate = check => check.Tags.Contains("ready")
    });
    app.MapMetrics();
}

app.Run();

public partial class Program { }
