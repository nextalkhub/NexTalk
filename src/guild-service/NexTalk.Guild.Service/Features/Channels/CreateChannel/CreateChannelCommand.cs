using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public record CreateChannelCommand(Guid GuildId, string Name, ChannelType Type, string CallerId);
