using NextTalk.Websocket.Gateway.Infrastructure;

namespace NextTalk.Websocket.Gateway.Features.Chat.SendMessage;

public sealed class SendMessageHandler(
    GuildServiceClient guildClient,
    MessagingServiceClient messagingClient,
    ILogger<SendMessageHandler> logger)
{
    public async Task<SendMessageResult> HandleAsync(SendMessageCommand command, CancellationToken ct)
    {
        // Проверяем доступ к каналу и получаем guildId — сервер авторитетен, клиенту не доверяем.
        var access = await guildClient.CheckChannelAccessAsync(
            command.ChannelId, command.UserId, command.CorrelationId, ct);

        if (access is null)
        {
            logger.LogWarning(
                "Канал не найден: channel={ChannelId} correlationId={CorrelationId}",
                command.ChannelId, command.CorrelationId);
            return new SendMessageResult(false, null, "Channel not found");
        }

        if (!access.HasAccess)
        {
            logger.LogWarning(
                "Доступ запрещён: user={UserId} channel={ChannelId} correlationId={CorrelationId}",
                command.UserId, command.ChannelId, command.CorrelationId);
            return new SendMessageResult(false, null, "Access denied");
        }

        var messageRequest = new MessagingServiceClient.CreateMessageRequest(
            command.ChannelId, access.GuildId, command.UserId, command.AuthorName, command.Content);

        var (success, message, error) = await messagingClient.CreateMessageAsync(
            messageRequest, command.IdempotencyKey, command.CorrelationId, ct);

        if (!success)
        {
            logger.LogError(
                "Ошибка создания сообщения: user={UserId} channel={ChannelId} correlationId={CorrelationId} error={Error}",
                command.UserId, command.ChannelId, command.CorrelationId, error);
            return new SendMessageResult(false, null, error ?? "Failed to save message");
        }

        logger.LogInformation(
            "Сообщение создано: id={MessageId} channel={ChannelId} user={UserId} correlationId={CorrelationId}",
            message?.Id, command.ChannelId, command.UserId, command.CorrelationId);

        return new SendMessageResult(true, message, null);
    }
}

public record SendMessageResult(bool Success, MessagingServiceClient.MessageDto? Message, string? Error);
