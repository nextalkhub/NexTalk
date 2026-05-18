namespace NexTalk.Guild.Service.Shared.Responses;

public record MemberResponse(string UserId, string DisplayName, string Username, string Role, DateTimeOffset JoinedAt);
