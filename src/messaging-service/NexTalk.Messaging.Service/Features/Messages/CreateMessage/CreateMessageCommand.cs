namespace NexTalk.Messaging.Service.Features.Messages.CreateMessage;

/// <param name="ChannelId">Канал, в который отправляется сообщение</param>
/// <param name="GuildId">Сервер канала</param>
/// <param name="AuthorId">Id отправителя</param>
/// <param name="AuthorName">Отображаемое имя из JWT claim "name"</param>
/// <param name="Content">Текст сообщения</param>
/// <param name="IdempotencyKey">UUID от клиента. Повторный запрос с тем же ключом вернет кэш</param>
/// <param name="CorrelationId">Для логов и трассировки</param>
public record CreateMessageCommand(
    Guid ChannelId,
    Guid GuildId,
    string AuthorId,
    string AuthorName,
    string Content,
    string IdempotencyKey,
    string CorrelationId);
