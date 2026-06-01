using StackExchange.Redis;

namespace NextTalk.Websocket.Gateway.Shared;

public sealed class RedisConnectionManager : IConnectionManager
{
    private readonly IDatabase _db;
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(24);

    public RedisConnectionManager(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    public void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds)
    {
        _db.SetAdd(ConnsKey(userId), connectionId);
        _db.KeyExpire(ConnsKey(userId), Ttl);

        // Перезаписать набор гильдий: при OnConnected приходит актуальный список из guild-service.
        var key = GuildsKey(userId);
        _db.KeyDelete(key);
        if (guildIds.Count > 0)
        {
            var values = guildIds.Select(g => (RedisValue)g.ToString()).ToArray();
            _db.SetAdd(key, values);
            _db.KeyExpire(key, Ttl);
        }
    }

    public IReadOnlyList<Guid>? Unregister(string userId, string connectionId)
    {
        _db.SetRemove(ConnsKey(userId), connectionId);
        var remaining = _db.SetLength(ConnsKey(userId));
        if (remaining > 0) return null;

        var guildIds = ReadGuildSet(userId);
        _db.KeyDelete(ConnsKey(userId));
        _db.KeyDelete(GuildsKey(userId));
        return guildIds;
    }

    public void AddGuild(string userId, Guid guildId)
    {
        _db.SetAdd(GuildsKey(userId), guildId.ToString());
        _db.KeyExpire(GuildsKey(userId), Ttl);
    }

    public void RemoveGuild(string userId, Guid guildId) =>
        _db.SetRemove(GuildsKey(userId), guildId.ToString());

    public IReadOnlyList<string> GetConnectionIds(string userId)
    {
        var members = _db.SetMembers(ConnsKey(userId));
        return members.Select(m => (string)m!).ToList();
    }

    public IReadOnlyList<Guid> GetGuildIds(string userId) => ReadGuildSet(userId);

    public bool IsConnected(string userId) => _db.SetLength(ConnsKey(userId)) > 0;

    private List<Guid> ReadGuildSet(string userId)
    {
        var members = _db.SetMembers(GuildsKey(userId));
        var result = new List<Guid>(members.Length);
        foreach (var m in members)
        {
            if (Guid.TryParse((string?)m, out var g))
                result.Add(g);
        }
        return result;
    }

    private static string ConnsKey(string userId) => $"ws:conns:{userId}";
    private static string GuildsKey(string userId) => $"ws:guilds:{userId}";
}
