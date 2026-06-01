namespace NexTalk.Guild.Service.Features.Invites.DeleteInvite;

public record DeleteInviteCommand(Guid GuildId, string Code, string CallerId);
