using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.KickMember;

public class KickMemberHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly WsGatewayClient _wsGateway;
    private readonly VoiceServiceClient _voiceService;

    public KickMemberHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _voiceService = voiceService;
    }

    public async Task HandleAsync(KickMemberCommand cmd, CancellationToken ct = default)
    {
        var caller = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.CallerId, ct);
        var target = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (!_rbac.CanActOn(caller.Role, target.Role))
            throw new ForbiddenException("Insufficient role to kick this member.");

        _db.Members.Remove(target);
        await _db.SaveChangesAsync(ct);

        // Все вызовы — best-effort: сбой не откатывает кик.
        // Каждый вызов независим: сбой WS Gateway не должен блокировать отключение от голоса.
        try { await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "member.kicked",
            new { UserId = cmd.TargetUserId, cmd.GuildId }, ct); } catch { }
        try { await _wsGateway.DisconnectUserFromGuildAsync(cmd.GuildId, cmd.TargetUserId, ct); } catch { }
        try { await _voiceService.DisconnectUserAsync(cmd.TargetUserId, ct); } catch { }
    }
}
