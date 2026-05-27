using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;

namespace NexTalk.Guild.Service.Features.Invites.GetGuildInvites;

public class GetGuildInvitesHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;

    public GetGuildInvitesHandler(GuildDbContext db, RbacService rbac)
    {
        _db = db;
        _rbac = rbac;
    }

    public record InviteDto(
        Guid Id,
        string Code,
        string CreatedBy,
        int? MaxUses,
        int UsesCount,
        DateTimeOffset? ExpiresAt,
        DateTimeOffset CreatedAt);

    public async Task<IReadOnlyList<InviteDto>> HandleAsync(GetGuildInvitesQuery query, CancellationToken ct = default)
    {
        await _rbac.RequireAdminOrOwnerAsync(query.GuildId, query.CallerId, ct);

        return await _db.Invites
            .Where(i => i.GuildId == query.GuildId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new InviteDto(i.Id, i.Code, i.CreatedBy, i.MaxUses, i.UsesCount, i.ExpiresAt, i.CreatedAt))
            .ToListAsync(ct);
    }
}
