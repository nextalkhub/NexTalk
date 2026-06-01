using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Invites.DeleteInvite;

public class DeleteInviteHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;

    public DeleteInviteHandler(GuildDbContext db, RbacService rbac)
    {
        _db = db;
        _rbac = rbac;
    }

    public async Task HandleAsync(DeleteInviteCommand cmd, CancellationToken ct = default)
    {
        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var invite = await _db.Invites
            .FirstOrDefaultAsync(i => i.GuildId == cmd.GuildId && i.Code == cmd.Code, ct)
            ?? throw new NotFoundException("Invite not found.");

        _db.Invites.Remove(invite);
        await _db.SaveChangesAsync(ct);
    }
}
