namespace NextTalk.Websocket.Gateway.Shared;

public interface IConnectionManager
{
    void Register(string userId, string connectionId, IReadOnlyList<Guid> guildIds);
    bool TryUnregister(string userId, out Entry? entry);
    Entry? Get(string userId);
    bool IsConnected(string userId);

    public record Entry(string ConnectionId, IReadOnlyList<Guid> GuildIds);
}
