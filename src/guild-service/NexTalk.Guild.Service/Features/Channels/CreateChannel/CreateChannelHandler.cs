using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public class CreateChannelHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway)
{
    public async Task<ChannelResponse> HandleAsync(CreateChannelCommand cmd, CancellationToken ct = default)
    {
        if (!await db.Guilds.AnyAsync(g => g.Id == cmd.GuildId, ct))
            throw new NotFoundException("Guild not found.");

        await rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var channel = new Channel
        {
            Id = Guid.NewGuid(),
            GuildId = cmd.GuildId,
            Name = cmd.Name,
            Type = cmd.Type,
            CreatedAt = DateTime.UtcNow
        };

        db.Channels.Add(channel);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "channel-created",
                new { channel.Id, channel.GuildId, channel.Name, channel.Type }, ct);
        }
        catch { /* best-effort */ }

        return new ChannelResponse(channel.Id, channel.GuildId, channel.Name, channel.Type, channel.CreatedAt);
    }
}
