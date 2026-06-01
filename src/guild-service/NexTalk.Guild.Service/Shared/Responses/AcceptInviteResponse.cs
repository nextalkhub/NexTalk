namespace NexTalk.Guild.Service.Shared.Responses;

/// <summary>Результат принятия инвайта.</summary>
public record AcceptInviteResponse(string GuildId, string? ChannelId);
