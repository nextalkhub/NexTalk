namespace NexTalk.Guild.Service.Shared.Responses;

/// <summary>Публичный превью инвайта - возвращается до принятия.</summary>
public record InviteInfoResponse(
    Guid Id,
    string Code,
    Guid GuildId,
    string GuildName,
    int? MaxUses,
    int UserCount,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt);
