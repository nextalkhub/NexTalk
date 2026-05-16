using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure.Outbox;

/// <summary>
/// Каждую секунду опрашивает таблицу outbox_events и записывает необработанные события
/// в внутрипроцессный OutboxChannel для пересылки в WS Gateway через BroadcastConsumer.
///
/// Мягкая блокировка через PublishedAt: воркер выставляет published_at перед записью в канал.
/// После перезапуска события с published_at IS NOT NULL и processed = false будут
/// подняты повторно после истечения stale-порога е- гарантия доставки at-least-once.
/// </summary>
public sealed class OutboxWorker(
    IServiceScopeFactory scopeFactory,
    OutboxChannel channel,
    ILogger<OutboxWorker> logger) : BackgroundService
{
    private static readonly TimeSpan PollingInterval  = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan StaleThreshold   = TimeSpan.FromMinutes(2);
    private const int BatchSize = 50;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("OutboxWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "OutboxWorker: unhandled error during batch processing.");
            }

            await Task.Delay(PollingInterval, stoppingToken);
        }

        logger.LogInformation("OutboxWorker stopped.");
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Infrastructure.MessagingDbContext>();

        var staleThreshold = DateTime.UtcNow - StaleThreshold;

        // Берем события, которые еще не брались в обработку, либо зависли (published_at устарел).
        var events = await db.OutboxEvents
            .Where(e => !e.Processed &&
                        (e.PublishedAt == null || e.PublishedAt < staleThreshold))
            .OrderBy(e => e.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (events.Count == 0) return;

        // Помечаем как взятые до записи в канал - исключает повторный pickup на следующем поллинге.
        var now = DateTime.UtcNow;
        foreach (var e in events)
            e.PublishedAt = now;

        await db.SaveChangesAsync(ct);

        foreach (var e in events)
            await channel.Writer.WriteAsync(e, ct);

        logger.LogDebug("OutboxWorker: enqueued {Count} events.", events.Count);
    }
}
