namespace NextTalk.Websocket.Gateway.Shared;

public interface IPresenceTracker
{
    bool SetOnline(string userId);
    bool Remove(string userId);
    bool IsOnline(string userId);
    IReadOnlyList<string> GetStale(TimeSpan timeout);
    IReadOnlyList<string> GetAllOnline(TimeSpan timeout);
}
