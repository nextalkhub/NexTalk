using System.Threading;
using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public class AcceptInviteHandler
{
    private readonly GuildDbContext _db;
    private readonly WsGatewayClient _wsGateway;
    private readonly IInviteRepository _inviteRepository;

    public AcceptInviteHandler(GuildDbContext db, WsGatewayClient wsGateway, IInviteRepository inviteRepository)
    {
        _db = db;
        _wsGateway = wsGateway;
        _inviteRepository = inviteRepository;
    }

    public async Task<GuildResponse> HandleAsync(AcceptInviteCommand cmd, CancellationToken ct = default)
    {
        var row = await _db.Invites
            .Where(i => i.Code == cmd.Code)
            .Select(i => new { i.Id, i.GuildId })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Invite not found.");

        var isBanned = await _db.Bans.AnyAsync(b => b.GuildId == row.GuildId && b.UserId == cmd.UserId, ct);
        if (isBanned)
            throw new ForbiddenException("You are banned from this guild.");

        var alreadyMember = await _db.Members.AnyAsync(m => m.GuildId == row.GuildId && m.UserId == cmd.UserId, ct);
        if (alreadyMember)
            throw new BadRequestException("Already a member of this guild.");

        var claimed = await _inviteRepository.TryClaimAsync(row.Id, ct);
        if (!claimed)
            throw new BadRequestException("Invite has expired or reached its maximum uses.");

        var guild = await _db.Guilds.FindAsync([row.GuildId], ct)
            ?? throw new NotFoundException("Guild not found.");

        var member = new Member
        {
            GuildId = row.GuildId,
            UserId = cmd.UserId,
            DisplayName = cmd.DisplayName,
            Username = cmd.Username,
            Role = MemberRole.Member,
            JoinedAt = DateTimeOffset.UtcNow
        };

        _db.Members.Add(member);
        await _db.SaveChangesAsync(ct);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(row.GuildId, "member.joined",
                new { member.UserId, member.DisplayName, member.Username, member.GuildId }, ct);
        }
        catch { /* best-effort */ }

        return new GuildResponse(guild.Id, guild.Name, guild.OwnerId, guild.CreatedAt);
    }
}
