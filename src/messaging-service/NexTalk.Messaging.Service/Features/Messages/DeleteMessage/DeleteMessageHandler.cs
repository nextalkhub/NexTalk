using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public class DeleteMessageHandler
{
    private readonly MessagingDbContext _db;
    private readonly IGuildServiceClient _guildService;
    private readonly WsGatewayClient _wsGateway;
    private readonly ILogger<DeleteMessageHandler> _logger;

    public DeleteMessageHandler(MessagingDbContext db, IGuildServiceClient guildService, WsGatewayClient wsGateway, ILogger<DeleteMessageHandler> logger)
    {
        _db = db;
        _guildService = guildService;
        _wsGateway = wsGateway;
        _logger = logger;
    }

    public async Task HandleAsync(DeleteMessageCommand cmd, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == cmd.MessageId, ct);
        if (message is null)
            throw new NotFoundException("Message not found.");

        if (message.AuthorId != cmd.CallerId)
        {
            await _guildService.RequireAdminOrOwnerAsync(message.ChannelId, cmd.CallerId, ct);
        }

        _db.Messages.Remove(message);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Message deleted: id={MessageId} channel={ChannelId} guild={GuildId} caller={CallerId} correlation={CorrelationId}",
            cmd.MessageId, message.ChannelId, message.GuildId, cmd.CallerId, cmd.CorrelationId);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(
                message.GuildId,
                "message.deleted",
                new { MessageId = cmd.MessageId, ChannelId = message.ChannelId },
                string.IsNullOrEmpty(cmd.CorrelationId) ? Guid.NewGuid().ToString() : cmd.CorrelationId,
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast message.deleted: id={MessageId}", cmd.MessageId);
        }
    }
}
