using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Guilds.GetUserGuilds;

public class GetUserGuildsHandler
{
    private readonly GuildDbContext _db;

    public GetUserGuildsHandler(GuildDbContext db)
    {
        _db = db;
    }

    public async Task<List<GuildResponse>> HandleAsync(GetUserGuildsQuery query, CancellationToken ct = default) =>
        await _db.Guilds
            .Where(g => g.Members.Any(m => m.UserId == query.UserId))
            .Select(g => new GuildResponse(g.Id, g.Name, g.OwnerId, g.CreatedAt))
            .ToListAsync(ct);
}
