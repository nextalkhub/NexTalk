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

    public DeleteChannelHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _voiceService = voiceService;
    }

    public async Task HandleAsync(DeleteChannelCommand cmd, CancellationToken ct = default)
    {
        var channel = await _db.Channels.FirstOrDefaultAsync(c => c.Id == cmd.ChannelId && c.GuildId == cmd.GuildId, ct)
            ?? throw new NotFoundException("Channel not found.");

        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        if (channel.Type == ChannelType.Voice)
        {
            try { await _voiceService.DisconnectAllFromChannelAsync(cmd.ChannelId, ct); }
            catch { /* best-effort */ }
        }

        _db.Channels.Remove(channel);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "channel.deleted",
                new { ChannelId = cmd.ChannelId, cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
