using System.Threading;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public class AssignRoleHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;

    public AssignRoleHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
    }

    public async Task HandleAsync(AssignRoleCommand cmd, CancellationToken ct = default)
    {
        await _rbac.RequireOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var target = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (cmd.Role == MemberRole.Owner)
            throw new BadRequestException("Cannot assign Owner role via this endpoint.");

        target.Role = cmd.Role;
        await _db.SaveChangesAsync(ct);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "role.assigned",
                new { UserId = cmd.TargetUserId, Role = cmd.Role.ToString(), cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
