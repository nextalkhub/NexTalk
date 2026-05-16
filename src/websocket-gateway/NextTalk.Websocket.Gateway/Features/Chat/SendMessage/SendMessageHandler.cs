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

    public async Task<SendMessageResult> HandleAsync(SendMessageCommand command, CancellationToken cancellationToken)
    {
        var (hasAccess, _) = await _guildClient.CheckAccessAsync(
            command.GuildId, command.UserId, command.CorrelationId, cancellationToken);

        if (!hasAccess)
        {
            _logger.LogWarning("Access denied: user={UserId} guild={GuildId} correlationId={CorrelationId}",
                command.UserId, command.GuildId, command.CorrelationId);
            
            return new SendMessageResult(false, null, "Access denied");
        }
        
        var messageRequest = new MessagingServiceClient.CreateMessageRequest(
            command.ChannelId, command.GuildId, command.UserId, command.AuthorName, command.Content);
        
        var (success, message, error) = await _messagingClient.CreateMessageAsync(
            messageRequest, command.IdempotencyKey, command.CorrelationId, cancellationToken);

        if (!success)
        {
            _logger.LogError("Message creation failed: user={UserId} channel={ChannelId} correlationId={CorrelationId}, error={Error}",
                command.UserId, command.ChannelId, command.CorrelationId, error);
            
            return new SendMessageResult(false, null, error ?? "Failed to save message");
        }
        
        _logger.LogInformation("Message created: id={Message} channel={ChannelId} user={UserId} correlationId={CorrelationId}",
            message?.Id, command.ChannelId, command.UserId, command.CorrelationId);
        
        return new SendMessageResult(true, message, null);
    }
}

public record SendMessageResult(bool Success, MessagingServiceClient.MessageDto? Message, string? Error);
