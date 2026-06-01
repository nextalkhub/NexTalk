using NexTalk.Voice.Service.Infrastructure;

namespace NexTalk.Voice.Service.Features.Voice.Participants;

/// <summary>
/// Возвращает текущих участников голосового канала из SessionStore.
/// Нужен для первичной синхронизации: gateway-события voice.joined/left приходят
/// только тем, кто уже подключен, поэтому позже зашедший клиент не знает,
/// кто уже сидит в канале. Этот эндпоинт закрывает пробел.
/// </summary>
public static class GetParticipantsEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/voice/{channelId:guid}/participants", (
            Guid channelId,
            ISessionStore sessionStore) =>
        {
            var participants = sessionStore.GetParticipants(channelId);
            return Results.Ok(new GetParticipantsResult(channelId, participants));
        })
        .WithTags("Voice")
        .WithSummary("Текущие участники голосового канала")
        .WithDescription(
            "Возвращает userId всех, кто сейчас находится в голосовом канале. " +
            "Клиент вызывает при загрузке, чтобы восстановить состояние, недоступное " +
            "из real-time событий voice.joined/voice.left.")
        .Produces<GetParticipantsResult>(200)
        .Produces(401);
}

/// <summary>Список участников голосового канала.</summary>
/// <param name="ChannelId">Идентификатор голосового канала.</param>
/// <param name="Participants">userId участников, находящихся в канале.</param>
public record GetParticipantsResult(Guid ChannelId, IReadOnlyList<string> Participants);
