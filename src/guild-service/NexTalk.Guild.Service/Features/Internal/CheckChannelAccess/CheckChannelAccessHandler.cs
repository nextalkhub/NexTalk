using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public sealed class CheckChannelAccessHandler(GuildDbContext db)
{
    public record AccessResult(bool HasAccess, Guid GuildId, string ChannelType, string? Role);

    public async Task<AccessResult?> HandleAsync(CheckChannelAccessQuery query, CancellationToken ct = default)
    {
        var channel = await db.Channels
            .FirstOrDefaultAsync(c => c.Id == query.ChannelId, ct);

        if (channel is null)
            return null;

        var member = await db.Members
            .FirstOrDefaultAsync(m => m.GuildId == channel.GuildId && m.UserId == query.UserId, ct);

        var hasAccess = member is not null;
        return new AccessResult(hasAccess, channel.GuildId, channel.Type, member?.Role.ToString());
    }
}
