namespace NexTalk.Messaging.Service.Shared;

public record ChannelAccessResult(bool Allowed, Guid? GuildId);

public interface IGuildServiceClient
{
    Task<ChannelAccessResult> CheckChannelAccessAsync(Guid channelId, Guid userId, CancellationToken ct = default);
    Task RequireAdminOrOwnerAsync(Guid channelId, Guid userId, CancellationToken ct = default);
}
