namespace NexTalk.Guild.Service.Shared.Responses;

public record ChannelResponse(Guid Id, Guid GuildId, string Name, string Type, DateTime CreatedAt);
