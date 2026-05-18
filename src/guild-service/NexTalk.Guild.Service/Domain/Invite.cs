namespace NexTalk.Guild.Service.Domain;

public class Invite
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public string Code { get; set; } = null!;
    public string CreatedBy { get; set; } = null!;
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int UsesCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Guild Guild { get; set; } = null!;
}
