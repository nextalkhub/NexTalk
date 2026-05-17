namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public record GetMessagesQuery(Guid ChannelId, Guid UserId, Guid? Cursor, int Limit);

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    Guid AuthorId,
    string AuthorName,
    string Content,
    DateTime CreatedAt);

public record GetMessagesResponse(IReadOnlyList<MessageDto> Messages, Guid? NextCursor);
