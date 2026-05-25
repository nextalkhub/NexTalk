namespace NextTalk.Websocket.Gateway.Shared;

public interface IConnectionManager
{
    void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds);

    // Возвращает guildIds если это было последнее подключение пользователя, иначе null
    IReadOnlyList<Guid>? Unregister(string userId, string connectionId);

    // Добавить guildId в набор гильдий пользователя (без затрагивания connection set).
    // Нужно когда юзер принял инвайт или создал гильдию в активной сессии — чтобы
    // presence.offline разлетелся в новую гильдию при дисконнекте.
    void AddGuild(string userId, Guid guildId);

    // Убрать guildId (kick/ban/leave) — чтобы presence.offline не пришёл бывшим участникам.
    void RemoveGuild(string userId, Guid guildId);

    IReadOnlyList<string> GetConnectionIds(string userId);
    IReadOnlyList<Guid> GetGuildIds(string userId);
    bool IsConnected(string userId);
}
