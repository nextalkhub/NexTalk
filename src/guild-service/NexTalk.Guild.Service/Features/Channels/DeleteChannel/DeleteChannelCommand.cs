namespace NexTalk.Guild.Service.Features.Channels.DeleteChannel;

public record DeleteChannelCommand(Guid GuildId, Guid ChannelId, string CallerId);
