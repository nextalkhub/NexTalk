namespace NexTalk.Guild.Service.Shared.Responses;

public record GuildResponse(Guid Id, string Name, string OwnerId, DateTimeOffset CreatedAt);
