namespace NexTalk.Guild.Service.Shared.Responses;

public record MemberResponse(Guid Id, Guid UserId, string DisplayName, string Username, string Role, DateTime JoinedAt);
