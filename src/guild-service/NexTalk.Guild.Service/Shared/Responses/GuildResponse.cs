namespace NexTalk.Guild.Service.Shared.Responses;

/// <summary>Данные гильдии (сервера).</summary>
/// <param name="Id">Уникальный идентификатор гильдии (UUIDv7).</param>
/// <param name="Name">Название сервера (2–32 символа).</param>
/// <param name="OwnerId">Zitadel sub владельца сервера.</param>
/// <param name="CreatedAt">Дата и время создания (UTC).</param>
public record GuildResponse(Guid Id, string Name, string OwnerId, DateTimeOffset CreatedAt);
