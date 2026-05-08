using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public class CreateGuildHandler(GuildDbContext db)
{
    public async Task<Guid> HandleAsync(CreateGuildCommand cmd, CancellationToken ct = default)
    {
        var guild = new Guild
        {
            Id = Guid.NewGuid(),
            Name = cmd.Name,
            DisplayName = cmd.DisplayName,
            OwnerId = cmd.OwnerId,
            CreatedAt = DateTime.UtcNow
        };

        var owner = new Member
        {
            Id = Guid.NewGuid(),
            GuildId = guild.Id,
            UserId = cmd.OwnerId,
            DisplayName = cmd.OwnerDisplayName,
            Username = cmd.OwnerUsername,
            Role = MemberRole.Owner,
            JoinedAt = DateTime.UtcNow
        };

        var general = new Channel
        {
            Id = Guid.NewGuid(),
            GuildId = guild.Id,
            Name = "general",
            Type = "text",
            CreatedAt = DateTime.UtcNow
        };

        db.Guilds.Add(guild);
        db.Members.Add(owner);
        db.Channels.Add(general);
        await db.SaveChangesAsync(ct);

        return guild.Id;
    }
}
