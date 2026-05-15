using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public class CheckChannelAccessHandler(GuildDbContext db)
{
    public async Task<CheckChannelAccessResult> HandleAsync(CheckChannelAccessQuery query, CancellationToken ct = default)
    {
        var guildId = await db.Channels
            .Where(c => c.Id == query.ChannelId)
            .Select(c => (Guid?)c.GuildId)
            .FirstOrDefaultAsync(ct);

        if (guildId is null)
            return new CheckChannelAccessResult(false, null);

        var isMember = await db.Members
            .AnyAsync(m => m.GuildId == guildId.Value && m.UserId == query.UserId, ct);

        return new CheckChannelAccessResult(isMember, guildId);
    }
}
