using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace NexTalk.Messaging.Service.Infrastructure.Outbox;

/// <summary>
/// Читает события из внутрипроцессного канала и отправляет их в WS Gateway.
/// После успешного broadcast помечает событие как обработанное.
/// При ошибке событие остается необработанным - OutboxWorker повторно поставит его в очередь
/// после истечения stale-порога (гарантия доставки at-least-once).
/// </summary>
public sealed class BroadcastConsumer : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly OutboxChannel _channel;
    private readonly WsGatewayClient _wsGateway;
    private readonly ILogger<BroadcastConsumer> _logger;

    public BroadcastConsumer(
        IServiceScopeFactory scopeFactory,
        OutboxChannel channel,
        WsGatewayClient wsGateway,
        ILogger<BroadcastConsumer> logger)
    {
        _scopeFactory = scopeFactory;
        _channel = channel;
        _wsGateway = wsGateway;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("BroadcastConsumer started.");

        await foreach (var outboxEvent in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await BroadcastAsync(outboxEvent, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "BroadcastConsumer: failed to broadcast event {EventId} ({EventType}).",
                    outboxEvent.Id, outboxEvent.EventType);
                // Событие остается необработанным - OutboxWorker повторит попытку после stale-порога.
            }
        }

        _logger.LogInformation("BroadcastConsumer stopped.");
    }

    private async Task BroadcastAsync(Domain.OutboxEvent outboxEvent, CancellationToken ct)
    {
        var correlationId = Guid.NewGuid().ToString();
        var payload = JsonSerializer.Deserialize<object>(outboxEvent.Payload);

        await _wsGateway.BroadcastToGuildAsync(
            outboxEvent.GuildId,
            outboxEvent.EventType,
            payload ?? new { },
            correlationId,
            ct);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();

        await db.OutboxEvents
            .Where(e => e.Id == outboxEvent.Id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.ProcessedAt, DateTimeOffset.UtcNow), ct);

        _logger.LogDebug(
            "BroadcastConsumer: event {EventId} ({EventType}) broadcast to guild {GuildId}.",
            outboxEvent.Id, outboxEvent.EventType, outboxEvent.GuildId);
    }
}
