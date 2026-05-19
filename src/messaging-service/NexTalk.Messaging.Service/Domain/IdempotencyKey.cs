namespace NexTalk.Messaging.Service.Domain;

public class IdempotencyKey
{
    // UUID, переданный клиентом в заголовке X-Idempotency-Key.
    public string Key { get; init; } = "";

    // Сериализованное тело ответа - возвращается при повторном запросе с тем же ключом.
    public string Response { get; init; } = "{}";

    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
}
