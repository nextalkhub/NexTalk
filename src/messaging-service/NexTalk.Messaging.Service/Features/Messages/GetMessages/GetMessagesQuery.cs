namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public record GetMessagesQuery(Guid ChannelId, string UserId, Guid? Cursor, int Limit);

/// <summary>Сообщение канала.</summary>
/// <param name="Id">Идентификатор сообщения (UUIDv7).</param>
/// <param name="ChannelId">Идентификатор канала.</param>
/// <param name="AuthorId">Zitadel sub автора.</param>
/// <param name="AuthorName">Отображаемое имя автора на момент отправки.</param>
/// <param name="Content">Текст сообщения (1–4000 символов).</param>
/// <param name="CreatedAt">Дата и время отправки (UTC).</param>
public record MessageDto(
    Guid Id,
    Guid ChannelId,
    string AuthorId,
    string AuthorName,
    string Content,
    DateTimeOffset CreatedAt);

/// <summary>Страница сообщений канала.</summary>
/// <param name="Messages">Список сообщений (от новых к старым).</param>
/// <param name="NextCursor">Id последнего сообщения на странице - передать в cursor следующего запроса. Null если страниц больше нет.</param>
public record GetMessagesResponse(IReadOnlyList<MessageDto> Messages, Guid? NextCursor);
