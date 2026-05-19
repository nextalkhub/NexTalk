using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Channels.DeleteChannel;

public class DeleteChannelHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;
    private readonly VoiceServiceClient _voiceService;
    private readonly ILogger<DeleteChannelHandler> _logger;

    public DeleteChannelHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService, ILogger<DeleteChannelHandler> logger)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _voiceService = voiceService;
        _logger = logger;
    }

    public async Task HandleAsync(DeleteChannelCommand cmd, CancellationToken ct = default)
    {
        var channel = await _db.Channels.FirstOrDefaultAsync(c => c.Id == cmd.ChannelId && c.GuildId == cmd.GuildId, ct)
            ?? throw new NotFoundException("Channel not found.");

        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        if (channel.Type == ChannelType.Voice)
        {
            try { await _voiceService.DisconnectAllFromChannelAsync(cmd.ChannelId, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to disconnect voice channel={ChannelId} during delete", cmd.ChannelId); }
        }

        _db.Channels.Remove(channel);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Channel deleted: id={ChannelId} name={ChannelName} guild={GuildId} caller={CallerId}",
            cmd.ChannelId, channel.Name, cmd.GuildId, cmd.CallerId);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "channel.deleted",
                new { ChannelId = cmd.ChannelId, cmd.GuildId }, ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to broadcast channel.deleted: id={ChannelId}", cmd.ChannelId); }
    }
}
