namespace NextTalk.Websocket.Gateway.Features.Chat.SendMessage;

/// <param name="ChannelId">Id текстового канала</param>
/// <param name="Content">Текст сообщения</param>
/// <param name="IdempotencyKey">UUID, сгенерированный клиентом. Для проверки на дубли</param>
/// <param name="UserId">Id отправителя из JWT claim sub</param>
/// <param name="AuthorName">Отображаемое имя</param>
/// <param name="CorrelationId">ID трассировки, передаваемый во все downstream-сервисы</param>
public record SendMessageCommand(
    Guid ChannelId,
    string Content,
    string IdempotencyKey,
    Guid UserId,
    string AuthorName,
    string CorrelationId);
