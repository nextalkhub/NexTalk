namespace NexTalk.Guild.Service.Features.Channels.RenameChannel;

public record RenameChannelCommand(Guid GuildId, Guid ChannelId, string Name, string CallerId);
