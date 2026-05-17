using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace NexTalk.Messaging.Service.Infrastructure.Outbox;

/// <summary>
/// Читает события из внутрипроцессного канала и отправляет их в WS Gateway.
/// После успешного broadcast помечает событие как обработанное.
/// При ошибке событие остается необработанным - OutboxWorker повторно поставит его в очередь
/// после истечения stale-порога (гарантия доставки at-least-once).
/// </summary>
public sealed class BroadcastConsumer(
    IServiceScopeFactory scopeFactory,
    OutboxChannel channel,
    WsGatewayClient wsGateway,
    ILogger<BroadcastConsumer> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("BroadcastConsumer started.");

        await foreach (var outboxEvent in channel.Reader.ReadAllAsync(stoppingToken))
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
                logger.LogError(ex,
                    "BroadcastConsumer: failed to broadcast event {EventId} ({EventType}).",
                    outboxEvent.Id, outboxEvent.EventType);
                // Событие остается необработанным - OutboxWorker повторит попытку после stale-порога.
            }
        }

        logger.LogInformation("BroadcastConsumer stopped.");
    }

    private async Task BroadcastAsync(Domain.OutboxEvent outboxEvent, CancellationToken ct)
    {
        var correlationId = Guid.NewGuid().ToString();
        var payload = JsonSerializer.Deserialize<object>(outboxEvent.Payload);

        await wsGateway.BroadcastToGuildAsync(
            outboxEvent.GuildId,
            outboxEvent.EventType,
            payload ?? new { },
            correlationId,
            ct);

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();

        await db.OutboxEvents
            .Where(e => e.Id == outboxEvent.Id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Processed, true)
                .SetProperty(e => e.ProcessedAt, DateTime.UtcNow), ct);

        logger.LogDebug(
            "BroadcastConsumer: event {EventId} ({EventType}) broadcast to guild {GuildId}.",
            outboxEvent.Id, outboxEvent.EventType, outboxEvent.GuildId);
    }
}
