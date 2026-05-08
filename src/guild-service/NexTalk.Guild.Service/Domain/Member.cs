namespace NexTalk.Guild.Service.Domain;

public class Member
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = default!;
    public string Username { get; set; } = default!;
    public MemberRole Role { get; set; }
    public DateTime JoinedAt { get; set; }

    public Guild Guild { get; set; } = default!;
}
