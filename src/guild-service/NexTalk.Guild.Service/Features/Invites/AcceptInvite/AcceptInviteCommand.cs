using System;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public record AcceptInviteCommand(string Code, string UserId, string DisplayName, string Username);
