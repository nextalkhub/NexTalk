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
    private readonly ILogger<KickMemberHandler> _logger;

    public KickMemberHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService, ILogger<KickMemberHandler> logger)
    {
        _db = db;
        _rbac = rbac;
        _wsGateway = wsGateway;
        _voiceService = voiceService;
        _logger = logger;
    }

    public async Task HandleAsync(KickMemberCommand cmd, CancellationToken ct = default)
    {
        var caller = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.CallerId, ct);
        var target = await _rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (!_rbac.CanActOn(caller.Role, target.Role))
            throw new ForbiddenException("Insufficient role to kick this member.");

        _db.Members.Remove(target);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Member kicked: target={TargetUserId} guild={GuildId} caller={CallerId}",
            cmd.TargetUserId, cmd.GuildId, cmd.CallerId);

        // Все вызовы - best-effort: сбой не откатывает кик.
        // Каждый вызов независим: сбой WS Gateway не должен блокировать отключение от голоса.
        try { await _wsGateway.BroadcastToGuildAsync(cmd.GuildId, "member.kicked",
            new { UserId = cmd.TargetUserId, cmd.GuildId }, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to broadcast member.kicked: target={TargetUserId}", cmd.TargetUserId); }

        try { await _wsGateway.DisconnectUserFromGuildAsync(cmd.GuildId, cmd.TargetUserId, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to disconnect user from WS: target={TargetUserId}", cmd.TargetUserId); }

        try { await _voiceService.DisconnectUserAsync(cmd.TargetUserId, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to disconnect user from voice: target={TargetUserId}", cmd.TargetUserId); }
    }
}
