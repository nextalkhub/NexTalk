namespace NextTalk.Websocket.Gateway.Shared;

public sealed class ConnectionManager : IConnectionManager
{
    private readonly Dictionary<string, HashSet<string>> _conns = new();
    private readonly Dictionary<string, HashSet<Guid>> _guilds = new();
    private readonly object _lock = new();

    public void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds)
    {
        lock (_lock)
        {
            if (!_conns.TryGetValue(userId, out var set))
                _conns[userId] = set = [];
            set.Add(connectionId);
            _guilds[userId] = [.. guildIds];
        }
    }

    public IReadOnlyList<Guid>? Unregister(string userId, string connectionId)
    {
        lock (_lock)
        {
            if (!_conns.TryGetValue(userId, out var set)) return [];
            set.Remove(connectionId);
            if (set.Count > 0) return null;
            _conns.Remove(userId);
            _guilds.Remove(userId, out var guildIds);
            return guildIds is null ? [] : [.. guildIds];
        }
    }

    public void AddGuild(string userId, Guid guildId)
    {
        lock (_lock)
        {
            if (!_guilds.TryGetValue(userId, out var set))
                _guilds[userId] = set = [];
            set.Add(guildId);
        }
    }

    public void RemoveGuild(string userId, Guid guildId)
    {
        lock (_lock)
        {
            if (_guilds.TryGetValue(userId, out var set))
                set.Remove(guildId);
        }
    }

    public IReadOnlyList<string> GetConnectionIds(string userId)
    {
        lock (_lock)
        {
            return _conns.TryGetValue(userId, out var set) ? [.. set] : [];
        }
    }

    public IReadOnlyList<Guid> GetGuildIds(string userId)
    {
        lock (_lock)
        {
            return _guilds.TryGetValue(userId, out var guilds) ? [.. guilds] : [];
        }
    }

    public bool IsConnected(string userId)
    {
        lock (_lock)
        {
            return _conns.TryGetValue(userId, out var set) && set.Count > 0;
        }
    }
}
