namespace NexTalk.Messaging.Service.Domain;

public class Message
{
    public Guid Id { get; init; }
    public Guid ChannelId { get; init; }
    public Guid GuildId { get; init; }
    public string AuthorId { get; init; } = "";
    public string AuthorName { get; init; } = "";
    public string Content { get; init; } = "";
    public DateTimeOffset CreatedAt { get; init; }
}
