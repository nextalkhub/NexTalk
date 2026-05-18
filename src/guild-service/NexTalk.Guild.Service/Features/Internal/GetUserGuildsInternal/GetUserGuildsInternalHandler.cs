using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Internal.GetUserGuildsInternal;

public class GetUserGuildsInternalHandler
{
    private readonly GuildDbContext _db;

    public GetUserGuildsInternalHandler(GuildDbContext db)
    {
        _db = db;
    }

    public async Task<List<GuildResponse>> HandleAsync(GetUserGuildsInternalQuery query, CancellationToken ct = default) =>
        await _db.Guilds
            .Where(g => g.Members.Any(m => m.UserId == query.UserId))
            .Select(g => new GuildResponse(g.Id, g.Name, g.OwnerId, g.CreatedAt))
            .ToListAsync(ct);
}
