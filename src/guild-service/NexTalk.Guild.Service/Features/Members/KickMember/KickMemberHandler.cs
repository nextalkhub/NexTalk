using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Members.KickMember;

public class KickMemberHandler(GuildDbContext db, RbacService rbac, WsGatewayClient wsGateway, VoiceServiceClient voiceService)
{
    public async Task HandleAsync(KickMemberCommand cmd, CancellationToken ct = default)
    {
        var caller = await rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.CallerId, ct);
        var target = await rbac.GetMemberOrThrowAsync(cmd.GuildId, cmd.TargetUserId, ct);

        if (!rbac.CanActOn(caller.Role, target.Role))
            throw new ForbiddenException("Insufficient role to kick this member.");

        db.Members.Remove(target);
        await db.SaveChangesAsync(ct);

        // Все вызовы — best-effort: сбой не откатывает кик.
        // Каждый вызов независим: сбой WS Gateway не должен блокировать отключение от голоса.
        try { await wsGateway.BroadcastToGuildAsync(cmd.GuildId, "member.kicked",
            new { UserId = cmd.TargetUserId, cmd.GuildId }, ct); } catch { }
        try { await wsGateway.DisconnectUserFromGuildAsync(cmd.GuildId, cmd.TargetUserId, ct); } catch { }
        try { await voiceService.DisconnectUserAsync(cmd.TargetUserId, ct); } catch { }
    }
}
