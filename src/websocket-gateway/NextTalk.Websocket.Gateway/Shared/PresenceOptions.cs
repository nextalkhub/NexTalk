namespace NextTalk.Websocket.Gateway.Shared;

public sealed class PresenceOptions
{
    /// <summary>Ожидаемый интервал heartbeat от клиента в секундах.</summary>
    public int HeartbeatInterval { get; init; } = 20;

    /// <summary>Через сколько секунд без heartbeat пользователь считается офлайн</summary>
    public int OfflineTimeout { get; init; } = 30;
}
