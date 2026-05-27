using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;

namespace NexTalk.Guild.Service.Features.Guilds.UpdateGuild;

public class UpdateGuildHandler
{
    private readonly GuildDbContext _db;
    private readonly ILogger<UpdateGuildHandler> _logger;

    public UpdateGuildHandler(GuildDbContext db, ILogger<UpdateGuildHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<GuildResponse> HandleAsync(UpdateGuildCommand cmd, CancellationToken ct = default)
    {
        var guild = await _db.Guilds.FirstOrDefaultAsync(g => g.Id == cmd.GuildId, ct)
            ?? throw new NotFoundException("Guild not found.");

        if (guild.OwnerId != cmd.CallerId)
            throw new ForbiddenException("Only the Owner can update the guild.");

        guild.Name = cmd.Name;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Guild updated: id={GuildId} name={GuildName} caller={CallerId}",
            guild.Id, guild.Name, cmd.CallerId);

        return new GuildResponse(guild.Id, guild.Name, guild.OwnerId, guild.CreatedAt);
    }
}
