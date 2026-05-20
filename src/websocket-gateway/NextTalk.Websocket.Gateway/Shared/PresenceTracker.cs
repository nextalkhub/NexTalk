using System.Collections.Concurrent;

namespace NextTalk.Websocket.Gateway.Shared;

public sealed class PresenceTracker : IPresenceTracker
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _lastSeen = new();

    public bool SetOnline(string userId)
    {
        var wasOffline = !_lastSeen.ContainsKey(userId);
        _lastSeen[userId] = DateTimeOffset.UtcNow;
        return wasOffline;
    }

    public bool Remove(string userId) => _lastSeen.TryRemove(userId, out _);

    public bool IsOnline(string userId) => _lastSeen.ContainsKey(userId);

    public IReadOnlyList<string> GetStale(TimeSpan timeout)
    {
        return _lastSeen
            .Where(kv => DateTimeOffset.UtcNow - kv.Value > timeout)
            .Select(kv => kv.Key)
            .ToList();
    }
}
