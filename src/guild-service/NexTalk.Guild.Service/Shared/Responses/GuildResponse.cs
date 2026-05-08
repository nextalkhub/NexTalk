namespace NexTalk.Guild.Service.Shared.Responses;

public record GuildResponse(Guid Id, string Name, string DisplayName, Guid OwnerId, DateTime CreatedAt);
