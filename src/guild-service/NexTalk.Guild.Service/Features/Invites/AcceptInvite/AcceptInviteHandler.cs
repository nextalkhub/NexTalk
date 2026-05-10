using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public class AcceptInviteHandler(GuildDbContext db, WsGatewayClient wsGateway)
{
    public async Task HandleAsync(AcceptInviteCommand cmd, CancellationToken ct = default)
    {
        var invite = await db.Invites.FirstOrDefaultAsync(i => i.Code == cmd.Code, ct)
            ?? throw new NotFoundException("Invite not found.");

        if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value < DateTime.UtcNow)
            throw new BadRequestException("Invite has expired.");

        if (invite.MaxUses.HasValue && invite.UsesCount >= invite.MaxUses.Value)
            throw new BadRequestException("Invite has reached its maximum uses.");

        var alreadyMember = await db.Members.AnyAsync(m => m.GuildId == invite.GuildId && m.UserId == cmd.UserId, ct);
        if (alreadyMember)
            throw new BadRequestException("Already a member of this guild.");

        var isBanned = await db.Bans.AnyAsync(b => b.GuildId == invite.GuildId && b.UserId == cmd.UserId, ct);
        if (isBanned)
            throw new ForbiddenException("You are banned from this guild.");

        var member = new Member
        {
            Id = Guid.NewGuid(),
            GuildId = invite.GuildId,
            UserId = cmd.UserId,
            DisplayName = cmd.DisplayName,
            Username = cmd.Username,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        invite.UsesCount++;
        db.Members.Add(member);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(invite.GuildId, "member-joined",
                new { member.Id, member.UserId, member.DisplayName, member.Username, member.GuildId }, ct);
        }
        catch { /* best-effort */ }
    }
}
