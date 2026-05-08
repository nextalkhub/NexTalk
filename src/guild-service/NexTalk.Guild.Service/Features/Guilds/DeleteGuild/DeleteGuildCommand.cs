namespace NexTalk.Guild.Service.Features.Guilds.DeleteGuild;

public record DeleteGuildCommand(Guid GuildId, Guid CallerId);
