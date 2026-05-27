namespace NexTalk.Guild.Service.Features.Guilds.UpdateGuild;

public record UpdateGuildCommand(Guid GuildId, string Name, string CallerId);
