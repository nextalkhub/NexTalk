using NexTalk.Voice.Service.Infrastructure;

namespace NexTalk.Voice.Service.Features.Internal.DisconnectUser;

/// <summary>
/// Удаляет сессию, отключает от LiveKit и уведомляет участников гильдии.
/// Идемпотентен: если пользователь уже не в голосе - возвращает 204 без ошибки.
/// </summary>
public static class DisconnectUserEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/internal/voice/{userId}/disconnect", async (
            string userId,
            SessionStore sessionStore,
            LiveKitRoomClient roomClient,
            WsGatewayClient wsGateway,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var logger = loggerFactory.CreateLogger("VoiceDisconnectUser");
            var session = sessionStore.Leave(userId);

            if (session is null)
            {
                // Пользователь не был в голосовом канале - идемпотентный ответ.
                return Results.NoContent();
            }

            await roomClient.RemoveParticipantAsync(session.ChannelId, userId, ct);

            logger.LogInformation(
                "Internal disconnect user: user={UserId} channel={ChannelId} guild={GuildId}",
                userId, session.ChannelId, session.GuildId);

            try
            {
                await wsGateway.BroadcastToGuildAsync(
                    session.GuildId,
                    "voice.left",
                    new { UserId = userId, ChannelId = session.ChannelId },
                    Guid.NewGuid().ToString(),
                    ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Failed to broadcast voice.left on disconnect user: user={UserId}",
                    userId);
            }

            return Results.NoContent();
        }).AllowAnonymous().ExcludeFromDescription();
}
