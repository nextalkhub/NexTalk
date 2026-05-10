using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Guilds.DeleteGuild;

public class DeleteGuildHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway)
{
    public async Task HandleAsync(DeleteGuildCommand cmd, CancellationToken ct = default)
    {
        var guild = await db.Guilds.FindAsync([cmd.GuildId], ct)
            ?? throw new NotFoundException("Guild not found.");

        await rbac.RequireOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        db.Guilds.Remove(guild);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "guild-deleted", new { GuildId = cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
