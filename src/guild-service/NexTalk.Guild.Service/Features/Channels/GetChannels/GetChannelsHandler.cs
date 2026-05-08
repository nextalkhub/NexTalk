using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Channels.GetChannels;

public class GetChannelsHandler(GuildDbContext db)
{
    public async Task<List<ChannelResponse>> HandleAsync(GetChannelsQuery query, CancellationToken ct = default) =>
        await db.Channels
            .Where(c => c.GuildId == query.GuildId)
            .Select(c => new ChannelResponse(c.Id, c.GuildId, c.Name, c.Type, c.CreatedAt))
            .ToListAsync(ct);
}
