using NexTalk.Voice.Service.Infrastructure;
using NexTalk.Voice.Service.Shared.Exceptions;

namespace NexTalk.Voice.Service.Features.Voice.Join;

public sealed class JoinVoiceHandler(
    GuildServiceClient guildClient,
    LiveKitRoomClient roomClient,
    LiveKitTokenGenerator tokenGenerator,
    SessionStore sessionStore,
    WsGatewayClient wsGateway,
    IConfiguration config,
    ILogger<JoinVoiceHandler> logger)
{
    public async Task<JoinVoiceResult> HandleAsync(JoinVoiceCommand cmd, CancellationToken ct)
    {
        // 1. Проверяем доступ к каналу и получаем guildId + тип канала.
        var access = await guildClient.CheckChannelAccessAsync(cmd.ChannelId, cmd.UserId, cmd.CorrelationId, ct);

        if (access is null)
            throw new NotFoundException($"Канал {cmd.ChannelId} не найден.");

        if (!access.HasAccess)
            throw new ForbiddenException("Нет доступа к каналу.");

        if (!string.Equals(access.ChannelType, "voice", StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException($"Канал {cmd.ChannelId} не является голосовым.");

        // 2. Создаем LiveKit-комнату, если ещё не существует.
        await roomClient.EnsureRoomAsync(cmd.ChannelId, ct);

        // 3. Регистрируем сессию (если был в другом канале — переносимся).
        sessionStore.Join(cmd.UserId, cmd.ChannelId, access.GuildId);

        // 4. Генерируем токен для клиента.
        var token = tokenGenerator.GenerateToken(cmd.UserId, cmd.DisplayName, cmd.ChannelId);
        var livekitUrl = config["LiveKit:PublicUrl"]
                         ?? throw new InvalidOperationException("LiveKit:PublicUrl не задан.");

        logger.LogInformation(
            "Voice join: user={UserId} channel={ChannelId} guild={GuildId} correlation={CorrelationId}",
            cmd.UserId, cmd.ChannelId, access.GuildId, cmd.CorrelationId);

        // 5. Уведомляем участников гильдии через WS Gateway (best-effort - не фейлим join при ошибке).
        _ = BroadcastJoinAsync(access.GuildId, cmd.UserId, cmd.ChannelId, cmd.CorrelationId);

        return new JoinVoiceResult(token, livekitUrl, cmd.ChannelId, access.GuildId);
    }

    private async Task BroadcastJoinAsync(Guid guildId, Guid userId, Guid channelId, string correlationId)
    {
        try
        {
            await wsGateway.BroadcastToGuildAsync(
                guildId,
                "voice.joined",
                new { UserId = userId, ChannelId = channelId },
                correlationId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "Не удалось отправить voice.joined: user={UserId} channel={ChannelId}",
                userId, channelId);
        }
    }
}

public record JoinVoiceResult(string Token, string LiveKitUrl, Guid ChannelId, Guid GuildId);
