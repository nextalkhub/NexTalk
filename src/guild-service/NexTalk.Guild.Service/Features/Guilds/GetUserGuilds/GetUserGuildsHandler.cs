using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Guilds.GetUserGuilds;

public class GetUserGuildsHandler(GuildDbContext db)
{
    public async Task<List<GuildResponse>> HandleAsync(GetUserGuildsQuery query, CancellationToken ct = default) =>
        await db.Guilds
            .Where(g => g.Members.Any(m => m.UserId == query.UserId))
            .Select(g => new GuildResponse(g.Id, g.Name, g.DisplayName, g.OwnerId, g.CreatedAt))
            .ToListAsync(ct);
}
