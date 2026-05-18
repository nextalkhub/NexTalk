namespace NexTalk.Messaging.Service.Domain;

public class OutboxEvent
{
    public Guid Id { get; init; }
    public string EventType { get; init; } = "";
    public Guid GuildId { get; init; }

    // JSON-payload
    public string Payload { get; init; } = "{}";

    // Выставляется OutboxWorker в момент взятия события в обработку.
    // Предотвращает повторный pickup другим инстансом до истечения stale-таймаута.
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
    public DateTimeOffset  CreatedAt { get; init; }
}
