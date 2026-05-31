using System.Security.Claims;
using NexTalk.Voice.Service.Shared;

namespace NexTalk.Voice.Service.Features.Voice.Join;

public static class JoinVoiceEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/voice/{channelId:guid}/join", async (
            Guid channelId,
            ClaimsPrincipal principal,
            JoinVoiceHandler handler,
            CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var displayName = principal.GetDisplayName();
            var correlationId = Guid.NewGuid().ToString();

            var cmd = new JoinVoiceCommand(channelId, userId, displayName, correlationId);
            var result = await handler.HandleAsync(cmd, ct);

            return Results.Ok(result);
        })
        .WithTags("Voice")
        .WithSummary("Войти в голосовой канал")
        .WithDescription(
            "Верифицирует членство в гильдии и тип канала (voice), создает LiveKit-комнату при необходимости " +
            "и возвращает JWT-токен для прямого подключения к LiveKit SFU. " +
            "Если пользователь уже находится в другом голосовом канале - сессия переносится. " +
            "Остальные участники получают событие voice.joined по WebSocket.")
        .Produces<JoinVoiceResult>(200)
        .Produces(400)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(
            ("channelId", "Идентификатор голосового канала (тип voice). 400 если канал текстовый.")));
}
