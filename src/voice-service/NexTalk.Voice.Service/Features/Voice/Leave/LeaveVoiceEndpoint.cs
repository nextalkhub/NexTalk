using System.Security.Claims;
using NexTalk.Voice.Service.Shared;

namespace NexTalk.Voice.Service.Features.Voice.Leave;

public static class LeaveVoiceEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/voice/{channelId:guid}/leave", async (
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
        })
        .WithTags("Voice")
        .WithSummary("Покинуть голосовой канал")
        .WithDescription(
            "Удаляет сессию пользователя, принудительно отключает от LiveKit " +
            "и уведомляет участников гильдии событием voice.left по WebSocket.")
        .Produces(200)
        .Produces(401)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("channelId", "Идентификатор голосового канала.")));
}
