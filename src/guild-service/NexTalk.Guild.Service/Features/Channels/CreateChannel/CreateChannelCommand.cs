namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public record CreateChannelCommand(Guid GuildId, string Name, string Type, Guid CallerId);
