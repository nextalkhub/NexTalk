namespace NexTalk.Guild.Service.Domain;

public class Guild
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string DisplayName { get; set; } = default!;
    public Guid OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Channel> Channels { get; set; } = [];
    public ICollection<Member> Members { get; set; } = [];
    public ICollection<Invite> Invites { get; set; } = [];
    public ICollection<Ban> Bans { get; set; } = [];
}
