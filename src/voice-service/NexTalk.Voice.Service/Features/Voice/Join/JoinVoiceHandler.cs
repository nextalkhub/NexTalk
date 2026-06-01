using NexTalk.Voice.Service.Infrastructure;
using NexTalk.Voice.Service.Shared;
using NexTalk.Voice.Service.Shared.Exceptions;

namespace NexTalk.Voice.Service.Features.Voice.Join;

public sealed class JoinVoiceHandler
{
    private readonly GuildServiceClient _guildClient;
    private readonly LiveKitRoomClient _roomClient;
    private readonly LiveKitTokenGenerator _tokenGenerator;
    private readonly ISessionStore _sessionStore;
    private readonly WsGatewayClient _wsGateway;
    private readonly IConfiguration _config;
    private readonly ILogger<JoinVoiceHandler> _logger;

    public JoinVoiceHandler(
        GuildServiceClient guildClient,
        LiveKitRoomClient roomClient,
        LiveKitTokenGenerator tokenGenerator,
        ISessionStore sessionStore,
        WsGatewayClient wsGateway,
        IConfiguration config,
        ILogger<JoinVoiceHandler> logger)
    {
        _guildClient = guildClient;
        _roomClient = roomClient;
        _tokenGenerator = tokenGenerator;
        _sessionStore = sessionStore;
        _wsGateway = wsGateway;
        _config = config;
        _logger = logger;
    }

    public async Task<JoinVoiceResult> HandleAsync(JoinVoiceCommand cmd, CancellationToken ct)
    {
        var access = await _guildClient.CheckChannelAccessAsync(cmd.ChannelId, cmd.UserId, cmd.CorrelationId, ct);

        if (access is null)
            throw new NotFoundException($"Channel {cmd.ChannelId} not found.");

        if (!access.HasAccess)
            throw new ForbiddenException("Access to channel denied.");

        if (!string.Equals(access.ChannelType, "voice", StringComparison.OrdinalIgnoreCase))
            throw new BadRequestException($"Channel {cmd.ChannelId} is not a voice channel.");

        await _roomClient.EnsureRoomAsync(cmd.ChannelId, ct);

        _sessionStore.Join(cmd.UserId, cmd.ChannelId, access.GuildId);

        var token = _tokenGenerator.GenerateToken(cmd.UserId, cmd.DisplayName, cmd.ChannelId);
        var livekitUrl = _config["LiveKit:PublicUrl"]
                         ?? throw new InvalidOperationException("LiveKit:PublicUrl is not configured.");

        NexTalkMetrics.ActiveVoiceSessions.Inc();
        _logger.LogInformation(
            "Voice join: user={UserId} channel={ChannelId} guild={GuildId} correlation={CorrelationId}",
            cmd.UserId, cmd.ChannelId, access.GuildId, cmd.CorrelationId);

        // best-effort: не фейлим join если WS Gateway недоступен
        _ = BroadcastJoinAsync(access.GuildId, cmd.UserId, cmd.ChannelId, cmd.CorrelationId);

        return new JoinVoiceResult(token, livekitUrl, cmd.ChannelId, access.GuildId);
    }

    private async Task BroadcastJoinAsync(Guid guildId, string userId, Guid channelId, string correlationId)
    {
        try
        {
            await _wsGateway.BroadcastToGuildAsync(
                guildId,
                "voice.joined",
                new { UserId = userId, ChannelId = channelId },
                correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to broadcast voice.joined: user={UserId} channel={ChannelId}",
                userId, channelId);
        }
    }
}

/// <summary>Данные для подключения к голосовому каналу.</summary>
/// <param name="Token">JWT-токен LiveKit для подключения клиента к SFU.</param>
/// <param name="LiveKitUrl">WebSocket URL LiveKit-сервера (wss://...).</param>
/// <param name="ChannelId">Идентификатор голосового канала.</param>
/// <param name="GuildId">Идентификатор гильдии, которой принадлежит канал.</param>
public record JoinVoiceResult(string Token, string LiveKitUrl, Guid ChannelId, Guid GuildId);
