using System.Collections.Concurrent;

namespace NextTalk.Websocket.Gateway.Shared;

/// <summary>
/// Маппинг userId в (SignalR connectionId, список guildIds пользователя)
/// </summary>
public sealed class ConnectionManager
{
    private readonly ConcurrentDictionary<Guid, Entry> _entries = new();
    
    public void Register(Guid userId, string connectionId, IReadOnlyList<Guid> guildIds) 
        => _entries[userId] = new Entry(connectionId, guildIds);
    
    public bool TryUnregister(Guid userId, out Entry? entry) =>
        _entries.TryRemove(userId, out entry);
    
    public Entry? Get(Guid userId) =>
        _entries.TryGetValue(userId, out var e) ? e : null;
    
    public bool IsConnected(Guid userId) => _entries.ContainsKey(userId);
    
    public  record Entry(string ConnectionId, IReadOnlyList<Guid> GuildIds);
}
