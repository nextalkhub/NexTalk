namespace NextTalk.Websocket.Gateway.Shared;

public interface IUserActivityService
{
    Task RecordActivityAsync(string userId);
}
