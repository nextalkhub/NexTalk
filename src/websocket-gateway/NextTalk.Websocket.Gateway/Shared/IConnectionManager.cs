namespace NextTalk.Websocket.Gateway.Shared;

public interface IConnectionManager
{
    void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds);

    // Возвращает guildIds если это было последнее подключение пользователя, иначе null
    IReadOnlyList<Guid>? Unregister(string userId, string connectionId);

    IReadOnlyList<string> GetConnectionIds(string userId);
    IReadOnlyList<Guid> GetGuildIds(string userId);
    bool IsConnected(string userId);
}
