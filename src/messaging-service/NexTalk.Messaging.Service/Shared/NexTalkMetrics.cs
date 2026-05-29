using Prometheus;

namespace NexTalk.Messaging.Service.Shared;

internal static class NexTalkMetrics
{
    public static readonly Counter MessagesCreated = Metrics.CreateCounter(
        "nextalk_messages_created_total",
        "Всего созданных сообщений (без idempotency-повторов).");
}
