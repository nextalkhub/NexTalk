using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
// CS0118: 'Guild' resolves to NexTalk.Guild namespace via enclosing-namespace lookup.
using GuildAggregate = global::NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public class CreateGuildHandler
{
    private readonly GuildDbContext _db;
    private readonly ILogger<CreateGuildHandler> _logger;

    public CreateGuildHandler(GuildDbContext db, ILogger<CreateGuildHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Guid> HandleAsync(CreateGuildCommand cmd, CancellationToken ct = default)
    {
        var guild = new GuildAggregate
        {
            Id = Guid.CreateVersion7(),
            Name = cmd.Name,
            OwnerId = cmd.OwnerId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var owner = new Member
        {
            GuildId = guild.Id,
            UserId = cmd.OwnerId,
            DisplayName = cmd.OwnerDisplayName,
            Username = cmd.OwnerUsername,
            Role = MemberRole.Owner,
            JoinedAt = DateTimeOffset.UtcNow
        };

        var general = new Channel
        {
            Id = Guid.CreateVersion7(),
            GuildId = guild.Id,
            Name = "general",
            Type = ChannelType.Text,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.Guilds.Add(guild);
        _db.Members.Add(owner);
        _db.Channels.Add(general);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Guild created: id={GuildId} name={GuildName} owner={OwnerId}",
            guild.Id, guild.Name, cmd.OwnerId);

        return guild.Id;
    }
}
