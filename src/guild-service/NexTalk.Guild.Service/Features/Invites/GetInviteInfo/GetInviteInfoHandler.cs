using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Invites.GetInviteInfo;

public class GetInviteInfoHandler(GuildDbContext db)
{
    public async Task<InviteInfoResponse> HandleAsync(GetInviteInfoQuery query, CancellationToken ct = default)
    {
        var invite = await db.Invites
            .Include(i => i.Guild)
            .Where(i => i.Code == query.Code)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Invite not found.");

        var isExpired =
            (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value < DateTimeOffset.UtcNow) ||
            (invite.MaxUses.HasValue && invite.UsesCount >= invite.MaxUses.Value);

        if (isExpired)
            throw new GoneException("Invite has expired or reached its maximum uses.");

        var isBanned = await db.Bans.AnyAsync(
            b => b.GuildId == invite.GuildId && b.UserId == query.CallerId, ct);

        if (isBanned)
            throw new ForbiddenException("You are banned from this guild.");

        return new InviteInfoResponse(
            invite.Id,
            invite.Code,
            invite.GuildId,
            invite.Guild.Name,
            invite.MaxUses,
            invite.UsesCount,
            invite.ExpiresAt,
            invite.CreatedAt);
    }
}
