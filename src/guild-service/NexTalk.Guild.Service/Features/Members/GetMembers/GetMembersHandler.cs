using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Members.GetMembers;

public class GetMembersHandler
{
    private readonly GuildDbContext _db;

    public GetMembersHandler(GuildDbContext db)
    {
        _db = db;
    }

    public async Task<List<MemberResponse>> HandleAsync(GetMembersQuery query, CancellationToken ct = default) =>
        await _db.Members
            .Where(m => m.GuildId == query.GuildId)
            .Select(m => new MemberResponse(m.UserId, m.DisplayName, m.Username, m.Role.ToString(), m.JoinedAt))
            .ToListAsync(ct);
}
