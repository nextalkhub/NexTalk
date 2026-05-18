namespace NexTalk.Guild.Service.Domain;

public class Ban
{
    public Guid GuildId { get; set; }
    public string UserId { get; set; } = null!;
    public string BannedBy { get; set; } = null!;
    public string? Reason { get; set; } = null!;
    public DateTimeOffset BannedAt { get; set; }

    public Guild Guild { get; set; } = null!;
}
