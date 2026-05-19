namespace NexTalk.Guild.Service.Shared.Responses;

/// <summary>Данные участника гильдии.</summary>
/// <param name="UserId">Zitadel sub пользователя.</param>
/// <param name="DisplayName">Отображаемое имя (снимок из JWT на момент вступления).</param>
/// <param name="Username">Уникальное имя пользователя (снимок из JWT).</param>
/// <param name="Role">Роль в гильдии: <c>Member</c>, <c>Admin</c> или <c>Owner</c>.</param>
/// <param name="JoinedAt">Дата и время вступления (UTC).</param>
public record MemberResponse(string UserId, string DisplayName, string Username, string Role, DateTimeOffset JoinedAt);
