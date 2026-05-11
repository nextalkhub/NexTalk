using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public class InviteRepository(GuildDbContext db) : IInviteRepository
{
    public async Task<bool> TryClaimAsync(Guid inviteId, CancellationToken ct = default)
    {
        var updated = await db.Database.ExecuteSqlRёawAsync("""
            UPDATE guild.invites
            SET uses_count = uses_count + 1
            WHERE id = {0}
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (max_uses IS NULL OR uses_count < max_uses)
            """, [inviteId], ct);

        return updated > 0;
    }
}
