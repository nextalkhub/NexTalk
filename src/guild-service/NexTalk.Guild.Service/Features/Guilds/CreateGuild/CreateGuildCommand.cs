namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public record CreateGuildCommand(string Name, string OwnerId, string OwnerDisplayName, string OwnerUsername);
