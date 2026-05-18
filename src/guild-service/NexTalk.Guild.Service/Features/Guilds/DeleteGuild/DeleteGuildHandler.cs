using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Guilds.DeleteGuild;

public class DeleteGuildHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;
    private readonly VoiceServiceClient _voiceService;

    public DeleteGuildHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _voiceService = voiceService;
    }

    public async Task HandleAsync(DeleteGuildCommand cmd, CancellationToken ct = default)
    {
        var guild = await _db.Guilds.FirstOrDefaultAsync(g => g.Id == cmd.GuildId, ct)
            ?? throw new NotFoundException("Guild not found.");

        if (guild.OwnerId != cmd.CallerId)
            throw new ForbiddenException("Only the Owner can delete the guild.");

        // Отключить всех из голосовых каналов
        var voiceChannels = await _db.Channels
            .Where(c => c.GuildId == cmd.GuildId && c.Type == ChannelType.Voice)
            .ToListAsync(ct);

        foreach (var channel in voiceChannels)
        {
            try
            {
                await _voiceService.DisconnectAllFromChannelAsync(channel.Id, ct);
            }
            catch { /* best-effort */ }
        }

        // Удалить гильдию и все связанные данные
        _db.Members.RemoveRange(_db.Members.Where(m => m.GuildId == cmd.GuildId));
        _db.Channels.RemoveRange(_db.Channels.Where(c => c.GuildId == cmd.GuildId));
        _db.Invites.RemoveRange(_db.Invites.Where(i => i.GuildId == cmd.GuildId));
        _db.Bans.RemoveRange(_db.Bans.Where(b => b.GuildId == cmd.GuildId));
        _db.Guilds.Remove(guild);

        await _db.SaveChangesAsync(ct);

        // Broadcast об удалении гильдии
        try
        {
            await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "guild.deleted", new { GuildId = cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
