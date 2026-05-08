using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Shared;

public class RbacService(GuildDbContext db)
{
    public async Task RequireAdminOrOwnerAsync(Guid guildId, Guid userId, CancellationToken ct = default)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.GuildId == guildId && m.UserId == userId, ct);
        if (member is null || member.Role == MemberRole.Member)
            throw new ForbiddenException("Admin or Owner role required.");
    }

    public async Task RequireOwnerAsync(Guid guildId, Guid userId, CancellationToken ct = default)
    {
        var guild = await db.Guilds.FindAsync([guildId], ct);
        if (guild is null || guild.OwnerId != userId)
            throw new ForbiddenException("Owner role required.");
    }

    public async Task<Member> GetMemberOrThrowAsync(Guid guildId, Guid userId, CancellationToken ct = default)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.GuildId == guildId && m.UserId == userId, ct);
        return member ?? throw new NotFoundException($"Member not found in guild.");
    }

    public bool CanActOn(MemberRole caller, MemberRole target) => caller > target;
}
