using System.Security.Claims;
using NexTalk.Voice.Service.Shared;

namespace NexTalk.Voice.Service.Features.Voice.Join;

/// <summary>
/// Подключает пользователя к голосовому каналу.
/// Проверяет членство в гильдии, создает LiveKit-комнату при необходимости,
/// генерирует токен и уведомляет других участников через WS Gateway.
/// </summary>
public static class JoinVoiceEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/voice/{channelId:guid}/join", async (
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

            return Results.Ok(new
            {
                result.Token,
                result.LiveKitUrl,
                result.ChannelId,
                result.GuildId,
            });
        });
}
