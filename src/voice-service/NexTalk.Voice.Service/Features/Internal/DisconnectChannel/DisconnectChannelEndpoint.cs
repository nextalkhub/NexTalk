using NexTalk.Voice.Service.Infrastructure;

namespace NexTalk.Voice.Service.Features.Internal.DisconnectChannel;

/// <summary>
/// Отключает всех участников от LiveKit, удаляет комнату и уведомляет через WS Gateway.
/// Идемпотентен: если канал пуст или не существует - возвращает 204 без ошибки.
/// </summary>
public static class DisconnectChannelEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/internal/voice/channel/{channelId:guid}/disconnect-all", async (
            Guid channelId,
            SessionStore sessionStore,
            LiveKitRoomClient roomClient,
            WsGatewayClient wsGateway,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var logger = loggerFactory.CreateLogger("VoiceDisconnectChannel");
            var participants = sessionStore.ClearChannel(channelId);

            // Удаляем комнату целиком - LiveKit отключит всех оставшихся участников.
            await roomClient.DeleteRoomAsync(channelId, ct);

            logger.LogInformation(
                "Internal disconnect channel: channel={ChannelId} participants={Count}",
                channelId, participants.Count);

            // Уведомляем участников (best-effort, параллельно).
            var broadcastTasks = participants.Select(async p =>
            {
                try
                {
                    await wsGateway.BroadcastToGuildAsync(
                        p.Session.GuildId,
                        "voice.left",
                        new { UserId = p.UserId, ChannelId = channelId },
                        Guid.NewGuid().ToString(),
                        ct);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex,
                        "Failed to broadcast voice.left on disconnect channel: user={UserId}",
                        p.UserId);
                }
            });

            await Task.WhenAll(broadcastTasks);

            return Results.NoContent();
        }).AllowAnonymous().ExcludeFromDescription();
}
