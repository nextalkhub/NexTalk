namespace NexTalk.Guild.Service.Domain;

public class Ban
{
    public Guid GuildId { get; set; }
    public string UserId { get; set; } = null!;
    // Снимок имени на момент бана: после бана member удаляется, и резолвить имя больше негде.
    // Nullable - у старых записей до миграции значения нет.
    public string? DisplayName { get; set; }
    public string? Username { get; set; }
    public string BannedBy { get; set; } = null!;
    public string? Reason { get; set; } = null!;
    public DateTimeOffset BannedAt { get; set; }

    public Guild Guild { get; set; } = null!;
}
