using System.Collections.Concurrent;

namespace NextTalk.Websocket.Gateway.Shared;

/// <summary>
/// Маппинг userId в (SignalR connectionId, список guildIds пользователя)
/// </summary>
public sealed class ConnectionManager
{
    private readonly ConcurrentDictionary<string, Entry> _entries = new();

    public void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds)
        => _entries[userId] = new Entry(connectionId, guildIds);

    public bool TryUnregister(string userId, out Entry? entry) =>
        _entries.TryRemove(userId, out entry);

    public Entry? Get(string userId) =>
        _entries.TryGetValue(userId, out var e) ? e : null;

    public bool IsConnected(string userId) => _entries.ContainsKey(userId);

    public record Entry(string ConnectionId, IReadOnlyList<Guid> GuildIds);
}
