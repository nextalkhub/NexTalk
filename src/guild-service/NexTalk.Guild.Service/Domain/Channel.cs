namespace NexTalk.Guild.Service.Domain;

public class Channel
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public string Name { get; set; } = null!;
    public ChannelType Type { get; set; } = ChannelType.Text;
    public DateTimeOffset CreatedAt { get; set; }

    public Guild Guild { get; set; } = null!;
}
