using Microsoft.EntityFrameworkCore;

namespace NexTalk.Messaging.Service.Infrastructure;

public sealed class IdempotencyKeyCleanupService(
    IServiceScopeFactory scopeFactory,
    ILogger<IdempotencyKeyCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(ct))
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
            var deleted = await db.IdempotencyKeys
                .Where(k => k.ExpiresAt < DateTimeOffset.UtcNow)
                .ExecuteDeleteAsync(ct);

            if (deleted > 0)
                logger.LogInformation("Idempotency key cleanup: удалено {Count} просроченных ключей", deleted);
        }
    }
}
