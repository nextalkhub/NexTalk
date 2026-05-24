using NexTalk.Voice.Service.Infrastructure;
using NexTalk.Voice.Service.Shared.Exceptions;

namespace NexTalk.Voice.Service.Features.Voice.Leave;

public sealed class LeaveVoiceHandler
{
    private readonly LiveKitRoomClient _roomClient;
    private readonly ISessionStore _sessionStore;
    private readonly WsGatewayClient _wsGateway;
    private readonly ILogger<LeaveVoiceHandler> _logger;

    public LeaveVoiceHandler(
        LiveKitRoomClient roomClient,
        ISessionStore sessionStore,
        WsGatewayClient wsGateway,
        ILogger<LeaveVoiceHandler> logger)
    {
        _roomClient = roomClient;
        _sessionStore = sessionStore;
        _wsGateway = wsGateway;
        _logger = logger;
    }

    public async Task HandleAsync(LeaveVoiceCommand cmd, CancellationToken ct)
    {
        var session = _sessionStore.GetSession(cmd.UserId);

        // Проверяем, что пользователь в именно этом канале.
        if (session is null || session.ChannelId != cmd.ChannelId)
            throw new NotFoundException($"User {cmd.UserId} is not in channel {cmd.ChannelId}.");

        _sessionStore.Leave(cmd.UserId);

        // Отключаем от LiveKit (best-effort - клиент мог уже отвалиться по сети).
        await _roomClient.RemoveParticipantAsync(cmd.ChannelId, cmd.UserId, ct);

        _logger.LogInformation(
            "Voice leave: user={UserId} channel={ChannelId} guild={GuildId} correlation={CorrelationId}",
            cmd.UserId, cmd.ChannelId, session.GuildId, cmd.CorrelationId);

        // Уведомляем участников (best-effort).
        _ = BroadcastLeaveAsync(session.GuildId, cmd.UserId, cmd.ChannelId, cmd.CorrelationId);
    }

    private async Task BroadcastLeaveAsync(Guid guildId, string userId, Guid channelId, string correlationId)
    {
        try
        {
            await _wsGateway.BroadcastToGuildAsync(
                guildId,
                "voice.left",
                new { UserId = userId, ChannelId = channelId },
                correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to broadcast voice.left: user={UserId} channel={ChannelId}",
                userId, channelId);
        }
    }
}
