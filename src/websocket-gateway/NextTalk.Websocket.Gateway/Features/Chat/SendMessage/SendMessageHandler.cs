using NextTalk.Websocket.Gateway.Infrastructure;

namespace NextTalk.Websocket.Gateway.Features.Chat.SendMessage;

public sealed class SendMessageHandler
{
    private readonly GuildServiceClient _guildClient;
    private readonly MessagingServiceClient _messagingClient;
    private readonly ILogger<SendMessageHandler> _logger;

    public SendMessageHandler(
        GuildServiceClient guildClient,
        MessagingServiceClient messagingClient,
        ILogger<SendMessageHandler> logger)
    {
        _guildClient = guildClient;
        _messagingClient = messagingClient;
        _logger = logger;
    }

    public async Task<SendMessageResult> HandleAsync(SendMessageCommand command, CancellationToken ct)
    {
        var access = await _guildClient.CheckChannelAccessAsync(
            command.ChannelId, command.UserId, command.CorrelationId, ct);

        if (access is null)
        {
            _logger.LogWarning(
                "Channel not found: channel={ChannelId} correlation={CorrelationId}",
                command.ChannelId, command.CorrelationId);
            return new SendMessageResult(false, null, "Channel not found");
        }

        if (!access.HasAccess)
        {
            _logger.LogWarning(
                "Access denied: user={UserId} channel={ChannelId} correlation={CorrelationId}",
                command.UserId, command.ChannelId, command.CorrelationId);
            return new SendMessageResult(false, null, "Access denied");
        }

        var messageRequest = new MessagingServiceClient.CreateMessageRequest(
            command.ChannelId, access.GuildId, command.UserId, command.AuthorName, command.Content);

        var (success, message, error) = await _messagingClient.CreateMessageAsync(
            messageRequest, command.IdempotencyKey, command.CorrelationId, ct);

        if (!success)
        {
            _logger.LogError(
                "Failed to create message: user={UserId} channel={ChannelId} correlation={CorrelationId} error={Error}",
                command.UserId, command.ChannelId, command.CorrelationId, error);
            return new SendMessageResult(false, null, error ?? "Failed to save message");
        }

        _logger.LogInformation(
            "Message created: id={MessageId} channel={ChannelId} user={UserId} correlation={CorrelationId}",
            message?.Id, command.ChannelId, command.UserId, command.CorrelationId);

        return new SendMessageResult(true, message, null);
    }
}

public record SendMessageResult(bool Success, MessagingServiceClient.MessageDto? Message, string? Error);
