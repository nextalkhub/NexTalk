namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public record GetMessagesQuery(Guid ChannelId, string UserId, Guid? Cursor, int Limit);

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    string AuthorId,
    string AuthorName,
    string Content,
    DateTimeOffset CreatedAt);

public record GetMessagesResponse(IReadOnlyList<MessageDto> Messages, Guid? NextCursor);
