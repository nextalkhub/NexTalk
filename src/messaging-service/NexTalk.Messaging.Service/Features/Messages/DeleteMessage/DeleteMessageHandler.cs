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

    public DeleteMessageHandler(MessagingDbContext db, IGuildServiceClient guildService, WsGatewayClient wsGateway)
    {
        _db = db;
        _guildService = guildService;
        _wsGateway = wsGateway;
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

        try
        {
            await _wsGateway.BroadcastToGuildAsync(
                message.GuildId,
                "message.deleted",
                new { MessageId = cmd.MessageId, ChannelId = message.ChannelId },
                Guid.NewGuid().ToString(),
                ct);
        }
        catch { /* best-effort */ }
    }
}
