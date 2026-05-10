using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Internal.GetUserGuildsInternal;

public class GetUserGuildsInternalHandler(GuildDbContext db)
{
    public async Task<List<GuildResponse>> HandleAsync(GetUserGuildsInternalQuery query, CancellationToken ct = default) =>
        await db.Guilds
            .Where(g => g.Members.Any(m => m.UserId == query.UserId))
            .Select(g => new GuildResponse(g.Id, g.Name, g.DisplayName, g.OwnerId, g.CreatedAt))
            .ToListAsync(ct);
}
