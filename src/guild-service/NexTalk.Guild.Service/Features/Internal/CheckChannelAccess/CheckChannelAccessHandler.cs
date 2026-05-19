using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public sealed class CheckChannelAccessHandler
{
    private readonly GuildDbContext _db;

    public CheckChannelAccessHandler(GuildDbContext db)
    {
        _db = db;
    }

    public record AccessResult(bool HasAccess, Guid GuildId, string ChannelType, string? Role);

    public async Task<AccessResult?> HandleAsync(CheckChannelAccessQuery query, CancellationToken ct = default)
    {
        var channel = await _db.Channels
            .FirstOrDefaultAsync(c => c.Id == query.ChannelId, ct);

        if (channel is null)
            return null;

        var member = await _db.Members
            .FirstOrDefaultAsync(m => m.GuildId == channel.GuildId && m.UserId == query.UserId, ct);

        var hasAccess = member is not null;
        return new AccessResult(hasAccess, channel.GuildId, channel.Type.ToString().ToLower(), member?.Role.ToString());
    }
}
