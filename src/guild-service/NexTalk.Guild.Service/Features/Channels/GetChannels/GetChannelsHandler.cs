using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Channels.GetChannels;

public class GetChannelsHandler
{
    private readonly GuildDbContext _db;

    public GetChannelsHandler(GuildDbContext db)
    {
        _db = db;
    }

    public async Task<List<ChannelResponse>> HandleAsync(GetChannelsQuery query, CancellationToken ct = default)
    {
        var channels = await _db.Channels
            .Where(c => c.GuildId == query.GuildId)
            .ToListAsync(ct);

        return channels
            .Select(c => new ChannelResponse(c.Id, c.GuildId, c.Name, c.Type.ToString().ToLower(), c.CreatedAt))
            .ToList();
    }
}
