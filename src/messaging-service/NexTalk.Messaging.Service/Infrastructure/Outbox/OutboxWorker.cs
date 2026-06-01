using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;

namespace NexTalk.Messaging.Service.Infrastructure.Outbox;

/// <summary>
/// Каждую секунду опрашивает таблицу outbox_events и записывает необработанные события
/// в внутрипроцессный OutboxChannel для пересылки в WS Gateway через BroadcastConsumer.
///
/// Мягкая блокировка через PublishedAt: воркер выставляет published_at перед записью в канал.
/// После перезапуска события с published_at IS NOT NULL и processed_at IS NULL будут
/// подняты повторно после истечения stale-порога - гарантия доставки at-least-once.
/// </summary>
public sealed class OutboxWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly OutboxChannel _channel;
    private readonly ILogger<OutboxWorker> _logger;

    private static readonly TimeSpan PollingInterval = TimeSpan.FromSeconds(1);
    private static readonly TimeSpan StaleThreshold = TimeSpan.FromMinutes(2);
    private const int BatchSize = 50;

    public OutboxWorker(
        IServiceScopeFactory scopeFactory,
        OutboxChannel channel,
        ILogger<OutboxWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _channel = channel;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OutboxWorker started.");

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
                _logger.LogError(ex, "OutboxWorker: unhandled error during batch processing.");
            }

            await Task.Delay(PollingInterval, stoppingToken);
        }

        _logger.LogInformation("OutboxWorker stopped.");
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<Infrastructure.MessagingDbContext>();

        var staleThreshold = DateTimeOffset.UtcNow - StaleThreshold;

        // Берем события, которые еще не брались в обработку, либо зависли (published_at устарел).
        var events = await db.OutboxEvents
            .Where(e => e.ProcessedAt == null &&
                        (e.PublishedAt == null || e.PublishedAt < staleThreshold))
            .OrderBy(e => e.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (events.Count == 0) return;

        // Помечаем как взятые до записи в канал - исключает повторный pickup на следующем поллинге.
        var now = DateTimeOffset.UtcNow;
        foreach (var e in events)
            e.PublishedAt = now;

        await db.SaveChangesAsync(ct);

        foreach (var e in events)
            await _channel.Writer.WriteAsync(e, ct);

        _logger.LogDebug("OutboxWorker: enqueued {Count} events.", events.Count);
    }
}
