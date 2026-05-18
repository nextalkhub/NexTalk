using System.Collections.Concurrent;

namespace NextTalk.Websocket.Gateway.Shared;

/// <summary>
/// Хранит время последнего heartbeat для каждого userId (in-memory)
/// </summary>
public sealed class PresenceTracker
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _lastSeen = new();

    /// <summary>
    /// Фиксирует heartbeat для userId.
    /// </summary>
    /// <returns>True, если пользователь был офлайн (только что появился в сети)</returns>
    public bool SetOnline(string userId)
    {
        var wasOffline = !_lastSeen.ContainsKey(userId);
        _lastSeen[userId] = DateTimeOffset.UtcNow;
        return wasOffline;
    }

    public bool Remove(string userId) => _lastSeen.TryRemove(userId, out _);

    public bool IsOnline(string userId) => _lastSeen.ContainsKey(userId);

    /// <summary>
    /// Возвращает userId, чей последний heartbeat старше заданного времени
    /// </summary>
    public IReadOnlyList<string> GetStale(TimeSpan timeout)
    {
        return _lastSeen
            .Where(kv => DateTimeOffset.UtcNow - kv.Value > timeout)
            .Select(kv => kv.Key)
            .ToList();
    }
}
