using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public class CreateChannelHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;
    private readonly ILogger<CreateChannelHandler> _logger;

    public CreateChannelHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, ILogger<CreateChannelHandler> logger)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _logger = logger;
    }

    public async Task<ChannelResponse> HandleAsync(CreateChannelCommand cmd, CancellationToken ct = default)
    {
        if (!await _db.Guilds.AnyAsync(g => g.Id == cmd.GuildId, ct))
            throw new NotFoundException("Guild not found.");

        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var channel = new Channel
        {
            Id = Guid.CreateVersion7(),
            GuildId = cmd.GuildId,
            Name = cmd.Name,
            Type = cmd.Type,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.Channels.Add(channel);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Channel created: id={ChannelId} name={ChannelName} type={ChannelType} guild={GuildId} caller={CallerId}",
            channel.Id, channel.Name, channel.Type, cmd.GuildId, cmd.CallerId);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "channel.created",
                new { channel.Id, channel.GuildId, channel.Name, channel.Type }, ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to broadcast channel.created: id={ChannelId}", channel.Id); }

        return new ChannelResponse(channel.Id, channel.GuildId, channel.Name, channel.Type.ToString().ToLower(), channel.CreatedAt);
    }
}
