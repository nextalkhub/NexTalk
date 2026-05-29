using Prometheus;

namespace NextTalk.Websocket.Gateway.Shared;

internal static class NexTalkMetrics
{
    public static readonly Gauge ActiveConnections = Metrics.CreateGauge(
        "nextalk_websocket_connections_active",
        "Активных WebSocket-соединений (SignalR).");
}
