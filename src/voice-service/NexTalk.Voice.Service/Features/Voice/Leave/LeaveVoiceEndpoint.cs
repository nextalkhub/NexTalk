using System.Security.Claims;
using NexTalk.Voice.Service.Shared;

namespace NexTalk.Voice.Service.Features.Voice.Leave;

/// <summary>
/// Отключает пользователя от голосового канала.
/// Удаляет сессию, принудительно отключает от LiveKit и уведомляет других участников.
/// </summary>
public static class LeaveVoiceEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/api/voice/{channelId:guid}/leave", async (
            Guid channelId,
            ClaimsPrincipal principal,
            LeaveVoiceHandler handler,
            CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            var correlationId = Guid.NewGuid().ToString();

            var cmd = new LeaveVoiceCommand(channelId, userId, correlationId);
            await handler.HandleAsync(cmd, ct);

            return Results.Ok();
        });
}
