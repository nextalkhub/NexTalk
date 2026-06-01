using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.UnbanMember;

public class UnbanMemberHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly ILogger<UnbanMemberHandler> _logger;

    public UnbanMemberHandler(GuildDbContext db, RbacService rbac, ILogger<UnbanMemberHandler> logger)
    {
        _db = db;
        _rbac = rbac;
        _logger = logger;
    }

    public async Task HandleAsync(UnbanMemberCommand cmd, CancellationToken ct = default)
    {
        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var ban = await _db.Bans.FirstOrDefaultAsync(
            b => b.GuildId == cmd.GuildId && b.UserId == cmd.TargetUserId, ct);

        if (ban is null)
            throw new NotFoundException("Ban not found.");

        _db.Bans.Remove(ban);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Member unbanned: target={TargetUserId} guild={GuildId} caller={CallerId}",
            cmd.TargetUserId, cmd.GuildId, cmd.CallerId);
    }
}
