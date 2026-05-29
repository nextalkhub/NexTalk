using StackExchange.Redis;

namespace NextTalk.Websocket.Gateway.Shared;

// Отслеживает уникальных активных пользователей через Redis sorted set.
// Ключ: nextalk:user_activity, score = unix-timestamp активности, member = userId.
// DAU/WAU/MAU считаются как ZCOUNT за соответствующий диапазон времени.
// Все реплики gateway пишут в один ключ → точный cross-replica подсчёт.
public sealed class UserActivityService(
    IConnectionMultiplexer redis,
    ILogger<UserActivityService> logger) : BackgroundService, IUserActivityService
{
    private const string RedisKey      = "nextalk:user_activity";
    private const string KnownUsersKey = "nextalk:users_known";
    private static readonly TimeSpan UpdateInterval = TimeSpan.FromMinutes(1);

    public async Task RecordActivityAsync(string userId)
    {
        try
        {
            var db = redis.GetDatabase();
            var score = (double)DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            // NX=false: обновляем score если пользователь уже есть (обновляем timestamp)
            await db.SortedSetAddAsync(RedisKey, userId, score, SortedSetWhen.Always);
            // SET для подсчёта уникальных пользователей за всё время (не ротируется).
            await db.SetAddAsync(KnownUsersKey, userId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Не удалось записать активность пользователя {UserId}", userId);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Инициализируем гейджи немедленно (не ждём первую минуту)
        await UpdateMetricsAsync();

        using var timer = new PeriodicTimer(UpdateInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await UpdateMetricsAsync();
        }
    }

    private async Task UpdateMetricsAsync()
    {
        try
        {
            var db = redis.GetDatabase();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var monthAgo = now - 30L * 24 * 3600;
            var weekAgo  = now - 7L  * 24 * 3600;
            var dayAgo   = now - 24L * 3600;

            // Удаляем записи старше 30 дней чтобы sorted set не рос бесконечно
            await db.SortedSetRemoveRangeByScoreAsync(
                RedisKey, double.NegativeInfinity, monthAgo - 1);

            var mau = await db.SortedSetLengthAsync(RedisKey, monthAgo, now);
            var wau = await db.SortedSetLengthAsync(RedisKey, weekAgo, now);
            var dau = await db.SortedSetLengthAsync(RedisKey, dayAgo, now);

            NexTalkMetrics.MonthlyActiveUsers.Set(mau);
            NexTalkMetrics.WeeklyActiveUsers.Set(wau);
            NexTalkMetrics.DailyActiveUsers.Set(dau);

            var knownCount = await db.SetLengthAsync(KnownUsersKey);
            NexTalkMetrics.KnownUsersTotal.Set(knownCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Ошибка при обновлении DAU/WAU/MAU метрик");
        }
    }
}
