namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public record AcceptInviteCommand(string Code, Guid UserId, string DisplayName, string Username);
