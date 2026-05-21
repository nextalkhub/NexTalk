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
    private readonly ILogger<AssignRoleHandler> _logger;

    public AssignRoleHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, ILogger<AssignRoleHandler> logger)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _logger = logger;
    }

    public async Task HandleAsync(AssignRoleCommand cmd, CancellationToken ct = default)
    {
        await _rbac.RequireOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var target = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (cmd.Role == MemberRole.Owner)
            throw new BadRequestException("Cannot assign Owner role via this endpoint.");

        target.Role = cmd.Role;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Role assigned: target={TargetUserId} role={Role} guild={GuildId} caller={CallerId}",
            cmd.TargetUserId, cmd.Role, cmd.GuildId, cmd.CallerId);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "role.assigned",
                new { UserId = cmd.TargetUserId, Role = cmd.Role.ToString(), cmd.GuildId }, ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to broadcast role.assigned: target={TargetUserId}", cmd.TargetUserId); }
    }
}
