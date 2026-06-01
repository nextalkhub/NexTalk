using Prometheus;

namespace NexTalk.Voice.Service.Shared;

internal static class NexTalkMetrics
{
    public static readonly Gauge ActiveVoiceSessions = Metrics.CreateGauge(
        "nextalk_voice_sessions_active",
        "Активных голосовых сессий (пользователей в voice-каналах).");
}
