namespace NextTalk.Websocket.Gateway.Shared;

public sealed class PresenceOptions
{
    /// <summary>Ожидаемый интервал heartbeat от клиента в секундах.</summary>
    public int HeartbeatInterval { get; init; } = 20;

    /// <summary>Через сколько секунд без heartbeat пользователь считается офлайн.
    /// Должен с запасом перекрывать 2-3 интервала heartbeat — иначе сетевая дрожь
    /// или короткий reconnect SignalR флапает presence.online/offline.</summary>
    public int OfflineTimeout { get; init; } = 75;
}
