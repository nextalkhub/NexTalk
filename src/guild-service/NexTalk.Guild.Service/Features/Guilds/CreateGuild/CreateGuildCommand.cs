namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public record CreateGuildCommand(string Name, string DisplayName, Guid OwnerId, string OwnerDisplayName, string OwnerUsername);
