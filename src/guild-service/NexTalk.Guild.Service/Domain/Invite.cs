namespace NexTalk.Guild.Service.Domain;

public class Invite
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public string Code { get; set; } = default!;
    public Guid CreatedBy { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int UsesCount { get; set; }
    public DateTime CreatedAt { get; set; }

    public Guild Guild { get; set; } = default!;
}
