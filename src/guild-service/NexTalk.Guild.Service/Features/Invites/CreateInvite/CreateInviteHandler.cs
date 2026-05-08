using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public class CreateInviteHandler(GuildDbContext db, RbacService rbac)
{
    public record InviteResponse(Guid Id, string Code, Guid GuildId, DateTime? ExpiresAt, int? MaxUses, int UsesCount, DateTime CreatedAt);

    public async Task<InviteResponse> HandleAsync(CreateInviteCommand cmd, CancellationToken ct = default)
    {
        if (!await db.Guilds.AnyAsync(g => g.Id == cmd.GuildId, ct))
            throw new NotFoundException("Guild not found.");

        await rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var code = Guid.NewGuid().ToString("N")[..8].ToUpper();
        var invite = new Invite
        {
            Id = Guid.NewGuid(),
            GuildId = cmd.GuildId,
            Code = code,
            CreatedBy = cmd.CallerId,
            ExpiresAt = cmd.ExpiresIn.HasValue ? DateTime.UtcNow.Add(cmd.ExpiresIn.Value) : null,
            MaxUses = cmd.MaxUses,
            UsesCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        db.Invites.Add(invite);
        await db.SaveChangesAsync(ct);

        return new InviteResponse(invite.Id, invite.Code, invite.GuildId, invite.ExpiresAt, invite.MaxUses, invite.UsesCount, invite.CreatedAt);
    }
}
