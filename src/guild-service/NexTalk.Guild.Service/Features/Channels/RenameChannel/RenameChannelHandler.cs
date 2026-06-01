using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Channels.RenameChannel;

public class RenameChannelHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;
    private readonly ILogger<RenameChannelHandler> _logger;

    public RenameChannelHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, ILogger<RenameChannelHandler> logger)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _logger = logger;
    }

    public async Task<ChannelResponse> HandleAsync(RenameChannelCommand cmd, CancellationToken ct = default)
    {
        var channel = await _db.Channels
            .FirstOrDefaultAsync(c => c.Id == cmd.ChannelId && c.GuildId == cmd.GuildId, ct)
            ?? throw new NotFoundException("Channel not found.");

        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        channel.Name = cmd.Name;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Channel renamed: id={ChannelId} name={ChannelName} guild={GuildId} caller={CallerId}",
            channel.Id, channel.Name, cmd.GuildId, cmd.CallerId);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "channel.updated",
                new { channel.Id, channel.GuildId, channel.Name, channel.Type }, ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to broadcast channel.updated: id={ChannelId}", channel.Id); }

        return new ChannelResponse(channel.Id, channel.GuildId, channel.Name, channel.Type.ToString().ToLower(), channel.CreatedAt);
    }
}
