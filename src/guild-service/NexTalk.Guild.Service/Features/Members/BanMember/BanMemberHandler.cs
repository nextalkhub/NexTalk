using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.BanMember;

public class BanMemberHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;
    private readonly VoiceServiceClient _voiceService;

    public BanMemberHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _voiceService = voiceService;
    }

    public async Task HandleAsync(BanMemberCommand cmd, CancellationToken ct = default)
    {
        var caller = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.CallerId, ct);
        var target = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (!_rbac.CanActOn(caller.Role, target.Role))
            throw new ForbiddenException("Insufficient role to ban this member.");

        var alreadyBanned = await _db.Bans.AnyAsync(b => b.GuildId == cmd.GuildId && b.UserId == cmd.TargetUserId, ct);
        if (alreadyBanned)
            throw new BadRequestException("Member is already banned.");

        var ban = new Ban
        {
            GuildId = cmd.GuildId,
            UserId = cmd.TargetUserId,
            BannedBy = cmd.CallerId,
            BannedAt = DateTimeOffset.UtcNow
        };

        _db.Bans.Add(ban);
        _db.Members.Remove(target);
        await _db.SaveChangesAsync(ct);

        // Все вызовы — best-effort: сбой не откатывает бан.
        // Каждый вызов независим: сбой WS Gateway не должен блокировать отключение от голоса.
        try { await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "member.banned",
            new { UserId = cmd.TargetUserId, cmd.GuildId }, ct); } catch { }
        try { await _wsGateway.DisconnectUserFromGuildAsync(cmd.GuildId, cmd.TargetUserId, ct); } catch { }
        try { await _voiceService.DisconnectUserAsync(cmd.TargetUserId, ct); } catch { }
    }
}
