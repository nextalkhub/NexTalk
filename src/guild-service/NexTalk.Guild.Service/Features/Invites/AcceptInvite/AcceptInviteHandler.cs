using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public class AcceptInviteHandler(GuildDbContext db, WsGatewayClient wsGateway, IInviteRepository inviteRepository)
{
    public async Task<GuildResponse> HandleAsync(AcceptInviteCommand cmd, CancellationToken ct = default)
    {
        var row = await db.Invites
            .Where(i => i.Code == cmd.Code)
            .Select(i => new { i.Id, i.GuildId })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Invite not found.");

        var isBanned = await db.Bans.AnyAsync(b => b.GuildId == row.GuildId && b.UserId == cmd.UserId, ct);
        if (isBanned)
            throw new ForbiddenException("You are banned from this guild.");

        var alreadyMember = await db.Members.AnyAsync(m => m.GuildId == row.GuildId && m.UserId == cmd.UserId, ct);
        if (alreadyMember)
            throw new BadRequestException("Already a member of this guild.");

        var claimed = await inviteRepository.TryClaimAsync(row.Id, ct);
        if (!claimed)
            throw new BadRequestException("Invite has expired or reached its maximum uses.");

        var guild = await db.Guilds.FindAsync([row.GuildId], ct)
            ?? throw new NotFoundException("Guild not found.");

        var member = new Member
        {
            Id = Guid.NewGuid(),
            GuildId = row.GuildId,
            UserId = cmd.UserId,
            DisplayName = cmd.DisplayName,
            Username = cmd.Username,
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        db.Members.Add(member);
        await db.SaveChangesAsync(ct);

        try
        {
            await wsGateway.BroadcastToGuildAsync(row.GuildId, "member-joined",
                new { member.Id, member.UserId, member.DisplayName, member.Username, member.GuildId }, ct);
        }
        catch { /* best-effort */ }

        return new GuildResponse(guild.Id, guild.Name, guild.DisplayName, guild.OwnerId, guild.CreatedAt);
    }
}
