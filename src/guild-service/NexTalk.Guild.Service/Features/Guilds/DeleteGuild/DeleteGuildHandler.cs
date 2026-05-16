using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Guilds.DeleteGuild;

public class DeleteGuildHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
{
    public async Task HandleAsync(DeleteGuildCommand cmd, CancellationToken ct = default)
    {
        var guild = await db.Guilds.FirstOrDefaultAsync(g => g.Id == cmd.GuildId, ct)
            ?? throw new NotFoundException("Guild not found.");

        if (guild.OwnerId != cmd.CallerId)
            throw new ForbiddenException("Only the Owner can delete the guild.");

        // Отключить всех из голосовых каналов
        var voiceChannels = await db.Channels
            .Where(c => c.GuildId == cmd.GuildId && c.Type == "voice")
            .ToListAsync(ct);

        foreach (var channel in voiceChannels)
        {
            try
            {
                await voiceService.DisconnectAllFromChannelAsync(channel.Id, ct);
            }
            catch { /* best-effort */ }
        }

        // Удалить гильдию и все связанные данные
        db.Members.RemoveRange(db.Members.Where(m => m.GuildId == cmd.GuildId));
        db.Channels.RemoveRange(db.Channels.Where(c => c.GuildId == cmd.GuildId));
        db.Invites.RemoveRange(db.Invites.Where(i => i.GuildId == cmd.GuildId));
        db.Bans.RemoveRange(db.Bans.Where(b => b.GuildId == cmd.GuildId));
        db.Guilds.Remove(guild);

        await db.SaveChangesAsync(ct);

        // Broadcast об удалении гильдии
        try
        {
            await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "guild-deleted",
                new { GuildId = cmd.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
