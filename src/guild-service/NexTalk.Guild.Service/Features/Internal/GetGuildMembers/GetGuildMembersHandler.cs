using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Internal.GetGuildMembers;

public class GetGuildMembersHandler
{
    private readonly GuildDbContext _db;

    public GetGuildMembersHandler(GuildDbContext db)
    {
        _db = db;
    }

    public async Task<List<MemberResponse>> HandleAsync(GetGuildMembersQuery query, CancellationToken ct = default) =>
        await _db.Members
            .Where(m => m.GuildId == query.GuildId)
            .Select(m => new MemberResponse(m.UserId, m.DisplayName, m.Username, m.Role.ToString(), m.JoinedAt))
            .ToListAsync(ct);
}
