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
    private readonly ILogger<AcceptInviteHandler> _logger;

    public AcceptInviteHandler(GuildDbContext db, WsGatewayClient wsGateway, IInviteRepository inviteRepository, ILogger<AcceptInviteHandler> logger)
    {
        _db = db;
        _wsGateway = wsGateway;
        _inviteRepository = inviteRepository;
        _logger = logger;
    }

    public async Task<AcceptInviteResponse> HandleAsync(AcceptInviteCommand cmd, CancellationToken ct = default)
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

        _logger.LogInformation("Member joined via invite: user={UserId} guild={GuildId} code={InviteCode}",
            cmd.UserId, row.GuildId, cmd.Code);

        try
        {
            await _wsGateway.BroadcastToGuildAsync(row.GuildId, "member.joined",
                new { member.UserId, member.DisplayName, member.Username, member.GuildId }, ct);
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to broadcast member.joined: user={UserId} guild={GuildId}", cmd.UserId, row.GuildId); }

        var firstChannelId = await _db.Channels
            .Where(c => c.GuildId == row.GuildId && c.Type == ChannelType.Text)
            .OrderBy(c => c.CreatedAt)
            .Select(c => c.Id)
            .FirstOrDefaultAsync(ct);

        return new AcceptInviteResponse(guild.Id.ToString(), firstChannelId == Guid.Empty ? null : firstChannelId.ToString());
    }
}
