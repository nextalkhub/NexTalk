using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Channels.DeleteChannel;

public class DeleteChannelHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
{
    public async Task HandleAsync(DeleteChannelCommand cmd, CancellationToken ct = default)
    {
        var channel = await db.Channels.FirstOrDefaultAsync(c => c.Id == cmd.ChannelId && c.GuildId == cmd.GuildId, ct)
            ?? throw new NotFoundException("Channel not found.");

        await rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        if (channel.Type == "voice")
        {
            try { await voiceService.DisconnectAllFromChannelAsync(cmd.ChannelId, ct); }
            catch { /* best-effort */ }
        }

        db.Channels.Remove(channel);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "channel-deleted",
                new { ChannelId = cmd.ChannelId, cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
