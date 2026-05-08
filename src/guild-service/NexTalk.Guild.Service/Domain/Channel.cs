namespace NexTalk.Guild.Service.Domain;

public class Channel
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public string Name { get; set; } = default!;
    public string Type { get; set; } = "text";
    public DateTime CreatedAt { get; set; }

    public Guild Guild { get; set; } = default!;
}
