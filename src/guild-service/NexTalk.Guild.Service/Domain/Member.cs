namespace NexTalk.Guild.Service.Domain;

public class Member
{
    public Guid GuildId { get; set; }
    public string UserId { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string Username { get; set; } = null!;
    public MemberRole Role { get; set; }
    public DateTimeOffset JoinedAt { get; set; }

    public Guild Guild { get; set; } = null!;
}
