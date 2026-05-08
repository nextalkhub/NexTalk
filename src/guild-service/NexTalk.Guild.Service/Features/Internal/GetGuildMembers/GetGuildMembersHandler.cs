using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Internal.GetGuildMembers;

public class GetGuildMembersHandler(GuildDbContext db)
{
    public async Task<List<MemberResponse>> HandleAsync(GetGuildMembersQuery query, CancellationToken ct = default) =>
        await db.Members
            .Where(m => m.GuildId == query.GuildId)
            .Select(m => new MemberResponse(m.Id, m.UserId, m.DisplayName, m.Username, m.Role.ToString(), m.JoinedAt))
            .ToListAsync(ct);
}
