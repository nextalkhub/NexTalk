using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;

namespace NexTalk.Guild.Service.Features.Members.GetBans;

public class GetBansHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;

    public GetBansHandler(GuildDbContext db, RbacService rbac)
    {
        _db = db;
        _rbac = rbac;
    }

    public record BanDto(string UserId, string BannedBy, string? Reason, DateTimeOffset BannedAt);

    public async Task<IReadOnlyList<BanDto>> HandleAsync(GetBansQuery query, CancellationToken ct = default)
    {
        await _rbac.RequireAdminOrOwnerAsync(query.GuildId, query.CallerId, ct);

        return await _db.Bans
            .Where(b => b.GuildId == query.GuildId)
            .OrderByDescending(b => b.BannedAt)
            .Select(b => new BanDto(b.UserId, b.BannedBy, b.Reason, b.BannedAt))
            .ToListAsync(ct);
    }
}
