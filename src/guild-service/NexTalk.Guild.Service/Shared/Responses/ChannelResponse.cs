namespace NexTalk.Guild.Service.Shared.Responses;

/// <summary>Данные канала.</summary>
/// <param name="Id">Уникальный идентификатор канала (UUIDv7).</param>
/// <param name="GuildId">Идентификатор гильдии, которой принадлежит канал.</param>
/// <param name="Name">Название канала (1–32 символа).</param>
/// <param name="Type">Тип канала: <c>text</c> или <c>voice</c>.</param>
/// <param name="CreatedAt">Дата и время создания (UTC).</param>
public record ChannelResponse(Guid Id, Guid GuildId, string Name, string Type, DateTimeOffset CreatedAt);
