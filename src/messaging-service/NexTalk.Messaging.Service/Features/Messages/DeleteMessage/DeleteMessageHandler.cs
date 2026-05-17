using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public class DeleteMessageHandler(MessagingDbContext db, IGuildServiceClient guildService, WsGatewayClient wsGateway)
{
    public async Task HandleAsync(DeleteMessageCommand cmd, CancellationToken ct = default)
    {
        var message = await db.Messages.FirstOrDefaultAsync(m => m.Id == cmd.MessageId, ct);
        if (message is null)
            throw new NotFoundException("Message not found.");

        if (message.AuthorId != cmd.CallerId)
        {
            await guildService.RequireAdminOrOwnerAsync(message.ChannelId, cmd.CallerId, ct);
        }

        db.Messages.Remove(message);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(
                message.GuildId,
                "message.deleted",
                new { MessageId = cmd.MessageId, ChannelId = message.ChannelId },
                Guid.NewGuid().ToString(),
                ct);
        }
        catch { /* best-effort */ }
    }
}
