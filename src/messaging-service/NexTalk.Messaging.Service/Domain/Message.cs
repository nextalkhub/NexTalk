namespace NexTalk.Messaging.Service.Domain;

public class Message
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid ChannelId { get; init; }
    public Guid GuildId { get; init; }
    public Guid AuthorId { get; init; }
    public string AuthorName { get; init; } = "";
    public string Content { get; init; } = "";
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
