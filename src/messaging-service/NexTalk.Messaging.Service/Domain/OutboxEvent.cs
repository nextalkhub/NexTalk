namespace NexTalk.Messaging.Service.Domain;

public class OutboxEvent
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string EventType { get; init; } = "";
    public Guid GuildId { get; init; }

    // JSON-payload
    public string Payload { get; init; } = "{}";

    // Выставляется OutboxWorker в момент взятия события в обработку.
    // Предотвращает повторный pickup другим инстансом до истечения stale-таймаута.
    public DateTime? PublishedAt { get; set; }

    public bool Processed { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
