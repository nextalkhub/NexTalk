namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public record CheckChannelAccessQuery(Guid ChannelId, Guid UserId);

public record CheckChannelAccessResult(bool Allowed, Guid? GuildId);
