using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public class AssignRoleHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway)
{
    public async Task HandleAsync(AssignRoleCommand cmd, CancellationToken ct = default)
    {
        await rbac.RequireOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var target = await rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (cmd.Role == MemberRole.Owner)
            throw new BadRequestException("Cannot assign Owner role via this endpoint.");

        target.Role = cmd.Role;
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "role-assigned",
                new { UserId = cmd.TargetUserId, Role = cmd.Role.ToString(), cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
