using System.Collections.Concurrent;

namespace NexTalk.Voice.Service.Infrastructure;

/// <summary>
/// In-memory хранилище голосовых сессий.
/// Поддерживает двунаправленный поиск: userId → сессия и channelId → множество участников.
/// Singleton: все состояние живет в памяти процесса - при рестарте сервиса сбрасывается.
/// </summary>
public sealed class SessionStore
{
    private readonly ConcurrentDictionary<string, VoiceSession> _userToSession = new();

    // ConcurrentDictionary<userId, byte> используется как потокобезопасное множество (set).
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> _channelToUsers = new();

    /// <summary>
    /// Добавляет пользователя в канал. Если пользователь уже в другом канале - переносит его.
    /// </summary>
    public void Join(string userId, Guid channelId, Guid guildId)
    {
        // Атомарно убираем из предыдущего канала, если был.
        if (_userToSession.TryGetValue(userId, out var prev) && prev.ChannelId != channelId)
            RemoveFromChannel(userId, prev.ChannelId);

        _userToSession[userId] = new VoiceSession(channelId, guildId);
        _channelToUsers.GetOrAdd(channelId, _ => new ConcurrentDictionary<string, byte>())
                       .TryAdd(userId, 0);
    }

    /// <summary>
    /// Удаляет пользователя из его текущего канала. Возвращает сессию, если она существовала.
    /// </summary>
    public VoiceSession? Leave(string userId)
    {
        if (!_userToSession.TryRemove(userId, out var session))
            return null;

        RemoveFromChannel(userId, session.ChannelId);
        return session;
    }

    /// <summary>
    /// Возвращает текущую сессию пользователя, или null если пользователь не в голосе.
    /// </summary>
    public VoiceSession? GetSession(string userId) =>
        _userToSession.TryGetValue(userId, out var s) ? s : null;

    /// <summary>
    /// Возвращает всех участников канала. Пустой список если канала нет или он пуст.
    /// </summary>
    public IReadOnlyList<string> GetParticipants(Guid channelId)
    {
        if (!_channelToUsers.TryGetValue(channelId, out var users))
            return [];
        return [.. users.Keys];
    }

    /// <summary>
    /// Удаляет всех участников канала из SessionStore. Возвращает их сессии для последующей очистки.
    /// </summary>
    public IReadOnlyList<(string UserId, VoiceSession Session)> ClearChannel(Guid channelId)
    {
        if (!_channelToUsers.TryRemove(channelId, out var users))
            return [];

        var removed = new List<(string, VoiceSession)>();
        foreach (var userId in users.Keys)
        {
            if (_userToSession.TryRemove(userId, out var session))
                removed.Add((userId, session));
        }
        return removed;
    }

    private void RemoveFromChannel(string userId, Guid channelId)
    {
        if (_channelToUsers.TryGetValue(channelId, out var users))
        {
            users.TryRemove(userId, out _);
            // Не удаляем пустой channelId из словаря - это допустимо и избегает гонок.
        }
    }
}

public record VoiceSession(Guid ChannelId, Guid GuildId);
