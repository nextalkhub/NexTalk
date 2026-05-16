using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public class DeleteMessageHandler(MessagingDbContext db, GuildServiceClient guildService, WsGatewayClient wsGateway)
{
    public async Task HandleAsync(DeleteMessageCommand cmd, CancellationToken ct = default)
    {
        var message = await db.Messages.FirstOrDefaultAsync(m => m.Id == cmd.MessageId, ct);
        if (message is null)
            throw new NotFoundException("Message not found.");

        if (message.AuthorId != cmd.CallerId)
        {
            await guildService.RequireAdminOrOwnerAsync(message.GuildId, cmd.CallerId, ct);
        }

        db.Messages.Remove(message);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToChannelAsync(message.ChannelId, "message.deleted",
                new { MessageId = cmd.MessageId, ChannelId = message.ChannelId }, ct);
        }
        catch { /* best-effort */ }
    }
}
