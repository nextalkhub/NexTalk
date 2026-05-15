namespace NexTalk.Messaging.Service.Domain;

public class Message
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = default!;
    public string Content { get; set; } = default!;
    public DateTime CreatedAt { get; set; }
}
