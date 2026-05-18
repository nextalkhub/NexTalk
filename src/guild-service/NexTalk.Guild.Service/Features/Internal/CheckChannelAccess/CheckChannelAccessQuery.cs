namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public record CheckChannelAccessQuery(Guid ChannelId, string UserId);
