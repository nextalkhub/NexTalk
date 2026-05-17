using NexTalk.Voice.Service.Infrastructure;
using NexTalk.Voice.Service.Shared.Exceptions;

namespace NexTalk.Voice.Service.Features.Voice.Leave;

public sealed class LeaveVoiceHandler(
    LiveKitRoomClient roomClient,
    SessionStore sessionStore,
    WsGatewayClient wsGateway,
    ILogger<LeaveVoiceHandler> logger)
{
    public async Task HandleAsync(LeaveVoiceCommand cmd, CancellationToken ct)
    {
        var session = sessionStore.GetSession(cmd.UserId);

        // Проверяем, что пользователь в именно этом канале.
        if (session is null || session.ChannelId != cmd.ChannelId)
            throw new NotFoundException($"Пользователь {cmd.UserId} не найден в канале {cmd.ChannelId}.");

        sessionStore.Leave(cmd.UserId);

        // Отключаем от LiveKit (best-effort - клиент мог уже отвалиться по сети).
        await roomClient.RemoveParticipantAsync(cmd.ChannelId, cmd.UserId, ct);

        logger.LogInformation(
            "Voice leave: user={UserId} channel={ChannelId} guild={GuildId} correlation={CorrelationId}",
            cmd.UserId, cmd.ChannelId, session.GuildId, cmd.CorrelationId);

        // Уведомляем участников (best-effort).
        _ = BroadcastLeaveAsync(session.GuildId, cmd.UserId, cmd.ChannelId, cmd.CorrelationId);
    }

    private async Task BroadcastLeaveAsync(Guid guildId, Guid userId, Guid channelId, string correlationId)
    {
        try
        {
            await wsGateway.BroadcastToGuildAsync(
                guildId,
                "voice.left",
                new { UserId = userId, ChannelId = channelId },
                correlationId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Не удалось отправить voice.left: user={UserId} channel={ChannelId}",
                userId, channelId);
        }
    }
}
