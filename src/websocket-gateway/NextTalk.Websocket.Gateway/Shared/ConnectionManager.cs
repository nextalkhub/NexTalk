using System.Collections.Concurrent;

namespace NextTalk.Websocket.Gateway.Shared;

public sealed class ConnectionManager : IConnectionManager
{
    private readonly ConcurrentDictionary<string, IConnectionManager.Entry> _entries = new();

    public void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds)
        => _entries[userId] = new IConnectionManager.Entry(connectionId, guildIds);

    public bool TryUnregister(string userId, out IConnectionManager.Entry? entry)
        => _entries.TryRemove(userId, out entry);

    public IConnectionManager.Entry? Get(string userId)
        => _entries.TryGetValue(userId, out var e) ? e : null;

    public bool IsConnected(string userId) => _entries.ContainsKey(userId);
}
