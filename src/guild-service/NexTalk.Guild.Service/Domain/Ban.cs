namespace NexTalk.Guild.Service.Domain;

public class Ban
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public Guid UserId { get; set; }
    public Guid BannedBy { get; set; }
    public DateTime BannedAt { get; set; }

    public Guild Guild { get; set; } = default!;
}
