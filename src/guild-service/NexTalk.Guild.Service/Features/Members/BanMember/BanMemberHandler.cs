using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.BanMember;

public class BanMemberHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway)
{
    public async Task HandleAsync(BanMemberCommand cmd, CancellationToken ct = default)
    {
        var caller = await rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.CallerId, ct);
        var target = await rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (!rbac.CanActOn(caller.Role, target.Role))
            throw new ForbiddenException("Insufficient role to ban this member.");

        var alreadyBanned = await db.Bans.AnyAsync(b => b.GuildId == cmd.GuildId && b.UserId == cmd.TargetUserId, ct);
        if (alreadyBanned)
            throw new BadRequestException("Member is already banned.");

        var ban = new Ban
        {
            Id = Guid.NewGuid(),
            GuildId = cmd.GuildId,
            UserId = cmd.TargetUserId,
            BannedBy = cmd.CallerId,
            BannedAt = DateTime.UtcNow
        };

        db.Bans.Add(ban);
        db.Members.Remove(target);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "member-banned",
                new { UserId = cmd.TargetUserId, cmd.GuildId }, ct);
            await wsGateway.DisconnectUserFromGuildAsync(cmd.GuildId, cmd.TargetUserId, ct);
        }
        catch { /* best-effort */ }
    }
}
