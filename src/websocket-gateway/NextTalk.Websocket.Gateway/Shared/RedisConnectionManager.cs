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
        var json = JsonSerializer.Serialize(new ConnectionData(connectionId, guildIds));
        _db.StringSet(Key(userId), json, Ttl);
    }

    public bool TryUnregister(string userId, out IConnectionManager.Entry? entry)
    {
        var json = _db.StringGetDelete(Key(userId));
        if (json.IsNullOrEmpty) { entry = null; return false; }
        entry = Deserialize(json!);
        return entry is not null;
    }

    public IConnectionManager.Entry? Get(string userId)
    {
        var json = _db.StringGet(Key(userId));
        return json.IsNullOrEmpty ? null : Deserialize(json!);
    }

    public bool IsConnected(string userId) => _db.KeyExists(Key(userId));

    private static string Key(string userId) => $"ws:conn:{userId}";

    private static IConnectionManager.Entry? Deserialize(string json)
    {
        var data = JsonSerializer.Deserialize<ConnectionData>(json);
        return data is null ? null : new IConnectionManager.Entry(data.ConnectionId, data.GuildIds);
    }

    private record ConnectionData(string ConnectionId, IReadOnlyList<Guid> GuildIds);
}
