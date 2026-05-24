using System.Text.Json;
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
        _db.StringSet(GuildsKey(userId), JsonSerializer.Serialize(guildIds), Ttl);
    }

    public IReadOnlyList<Guid>? Unregister(string userId, string connectionId)
    {
        _db.SetRemove(ConnsKey(userId), connectionId);
        var remaining = _db.SetLength(ConnsKey(userId));
        if (remaining > 0) return null;

        var guildsJson = _db.StringGetDelete(GuildsKey(userId));
        _db.KeyDelete(ConnsKey(userId));
        return guildsJson.IsNullOrEmpty
            ? []
            : JsonSerializer.Deserialize<List<Guid>>((string)guildsJson!) ?? [];
    }

    public IReadOnlyList<string> GetConnectionIds(string userId)
    {
        var members = _db.SetMembers(ConnsKey(userId));
        return members.Select(m => (string)m!).ToList();
    }

    public IReadOnlyList<Guid> GetGuildIds(string userId)
    {
        var json = _db.StringGet(GuildsKey(userId));
        return json.IsNullOrEmpty ? [] : JsonSerializer.Deserialize<List<Guid>>((string)json!) ?? [];
    }

    public bool IsConnected(string userId) => _db.SetLength(ConnsKey(userId)) > 0;

    private static string ConnsKey(string userId) => $"ws:conns:{userId}";
    private static string GuildsKey(string userId) => $"ws:guilds:{userId}";
}
