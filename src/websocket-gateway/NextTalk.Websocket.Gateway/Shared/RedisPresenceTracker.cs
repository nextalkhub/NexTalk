using StackExchange.Redis;

namespace NextTalk.Websocket.Gateway.Shared;

public sealed class RedisPresenceTracker : IPresenceTracker
{
    private readonly IDatabase _db;
    private const string Key = "ws:presence";

    public RedisPresenceTracker(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    public bool SetOnline(string userId)
    {
        var score = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        // SortedSetAdd returns true если элемент ДОБАВЛЕН (новый = был офлайн)
        // и false если обновлён (уже существовал = был онлайн)
        return _db.SortedSetAdd(Key, userId, score);
    }

    public bool Remove(string userId) => _db.SortedSetRemove(Key, userId);

    public bool IsOnline(string userId) => _db.SortedSetScore(Key, userId).HasValue;

    public IReadOnlyList<string> GetStale(TimeSpan timeout)
    {
        var cutoff = DateTimeOffset.UtcNow.Subtract(timeout).ToUnixTimeSeconds();
        return _db.SortedSetRangeByScore(Key, 0, cutoff)
            .Select(v => v.ToString())
            .ToList();
    }

    public IReadOnlyList<string> GetAllOnline(TimeSpan timeout)
    {
        var cutoff = DateTimeOffset.UtcNow.Subtract(timeout).ToUnixTimeSeconds();
        return _db.SortedSetRangeByScore(Key, cutoff, double.PositiveInfinity)
            .Select(v => v.ToString())
            .ToList();
    }
}
