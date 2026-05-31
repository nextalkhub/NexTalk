using StackExchange.Redis;

namespace NexTalk.Voice.Service.Infrastructure;

// Ключи:
//   voice:session:{userId}     - Hash: channelId, guildId
//   voice:channel:{channelId}  - Set:  userIds участников
//
// TTL = 8 часов на обоих ключах, обновляется при Join.
// Если под упал до Leave - сессия автоматически истечет через TTL.
//
// Ограничения:
//   Join не атомарен (read-then-write). На практике пользователь
//   не делает одновременный join с двух устройств, поэтому гонка маловероятна.
//
//   ClearChannel атомарен через Lua: SMEMBERS+DEL выполняются в одной транзакции,
//   что исключает двойную рассылку voice.left при параллельных вызовах.
public sealed class RedisSessionStore : ISessionStore
{
    private readonly IDatabase _db;
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(8);

    // Lua: атомарно возвращает всех участников и удаляет ключ канала.
    // Без этого два пода, вызвавших ClearChannel одновременно, оба получат
    // список участников и разошлют voice.left вдвойне.
    private static readonly LuaScript ClearChannelScript = LuaScript.Prepare(
        "local m = redis.call('SMEMBERS', @key) redis.call('DEL', @key) return m");

    public RedisSessionStore(IConnectionMultiplexer redis) => _db = redis.GetDatabase();

    public void Join(string userId, Guid channelId, Guid guildId)
    {
        var prev = GetSession(userId);
        if (prev is not null && prev.ChannelId != channelId)
            _db.SetRemove(ChannelKey(prev.ChannelId), userId);

        _db.HashSet(SessionKey(userId), [
            new HashEntry("channelId", channelId.ToString()),
            new HashEntry("guildId", guildId.ToString()),
        ]);
        _db.KeyExpire(SessionKey(userId), Ttl);
        _db.SetAdd(ChannelKey(channelId), userId);
        _db.KeyExpire(ChannelKey(channelId), Ttl);
    }

    public VoiceSession? Leave(string userId)
    {
        var session = GetSession(userId);
        if (session is null) return null;

        _db.KeyDelete(SessionKey(userId));
        _db.SetRemove(ChannelKey(session.ChannelId), userId);
        return session;
    }

    public VoiceSession? GetSession(string userId)
    {
        var entries = _db.HashGetAll(SessionKey(userId));
        return entries.Length == 0 ? null : ParseSession(entries);
    }

    public IReadOnlyList<string> GetParticipants(Guid channelId)
    {
        var members = _db.SetMembers(ChannelKey(channelId));
        return members.Select(m => (string)m!).ToList();
    }

    public IReadOnlyList<(string UserId, VoiceSession Session)> ClearChannel(Guid channelId)
    {
        var result = (RedisValue[]?)_db.ScriptEvaluate(
            ClearChannelScript, new { key = (RedisKey)ChannelKey(channelId) }) ?? [];

        var removed = new List<(string, VoiceSession)>(result.Length);
        foreach (var member in result)
        {
            var userId = (string)member!;
            var entries = _db.HashGetAll(SessionKey(userId));
            _db.KeyDelete(SessionKey(userId));

            // Если сессия не найдена (запись истекла по TTL или инконсистентность
            // при предыдущем краше) - пропускаем, broadcast не нужен.
            if (entries.Length > 0)
                removed.Add((userId, ParseSession(entries)));
        }
        return removed;
    }

    private static VoiceSession ParseSession(HashEntry[] entries)
    {
        string channelId = "", guildId = "";
        foreach (var e in entries)
        {
            if (e.Name == "channelId") channelId = e.Value.ToString();
            else if (e.Name == "guildId") guildId = e.Value.ToString();
        }
        return new VoiceSession(Guid.Parse(channelId), Guid.Parse(guildId));
    }

    private static string SessionKey(string userId) => $"voice:session:{userId}";
    private static string ChannelKey(Guid channelId) => $"voice:channel:{channelId}";
}
