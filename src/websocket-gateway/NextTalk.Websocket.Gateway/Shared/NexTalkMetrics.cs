using Prometheus;

namespace NextTalk.Websocket.Gateway.Shared;

internal static class NexTalkMetrics
{
    public static readonly Gauge ActiveConnections = Metrics.CreateGauge(
        "nextalk_websocket_connections_active",
        "Активных WebSocket-соединений (SignalR).");

    // Уникальных пользователей за скользящие окна. Вычисляется UserActivityService
    // по Redis sorted set (score = unix-timestamp последней активности).
    public static readonly Gauge DailyActiveUsers = Metrics.CreateGauge(
        "nextalk_daily_active_users",
        "Уникальных активных пользователей за последние 24 ч.");

    public static readonly Gauge WeeklyActiveUsers = Metrics.CreateGauge(
        "nextalk_weekly_active_users",
        "Уникальных активных пользователей за последние 7 дней.");

    public static readonly Gauge MonthlyActiveUsers = Metrics.CreateGauge(
        "nextalk_monthly_active_users",
        "Уникальных активных пользователей за последние 30 дней.");

    // Всего уникальных userId, когда-либо подключавшихся (из Redis SET).
    // Растёт монотонно — прокси-метрика для числа зарегистрированных пользователей.
    public static readonly Gauge KnownUsersTotal = Metrics.CreateGauge(
        "nextalk_users_known_total",
        "Всего уникальных пользователей когда-либо подключавшихся к сервису.");
}
