using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Features.Internal.CheckAccess;

public class CheckAccessHandler(GuildDbContext db)
{
    public record AccessResult(bool HasAccess, string? Role);

    public async Task<AccessResult> HandleAsync(CheckAccessQuery query, CancellationToken ct = default)
    {
        var member = await db.Members
            .FirstOrDefaultAsync(m => m.GuildId == query.GuildId && m.UserId == query.UserId, ct);

        if (member is null)
            return new AccessResult(false, null);

        return new AccessResult(member.Role >= query.RequiredRole, member.Role.ToString());
    }
}
