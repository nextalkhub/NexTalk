using Livekit.Server.Sdk.Dotnet;

namespace NexTalk.Voice.Service.Infrastructure;

/// <summary>
/// Генерирует короткоживущий JWT для подключения клиента к LiveKit-комнате.
/// Токен дает права на публикацию и подписку в рамках одной комнаты (channelId).
/// </summary>
public sealed class LiveKitTokenGenerator
{
    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly int _ttlMinutes;

    public LiveKitTokenGenerator(IConfiguration config)
    {
        _apiKey = config["LiveKit:ApiKey"] ?? throw new InvalidOperationException("LiveKit:ApiKey не задан.");
        _apiSecret = config["LiveKit:SecretKey"] ?? throw new InvalidOperationException("LiveKit:SecretKey не задан.");
        _ttlMinutes = int.TryParse(config["LiveKit:TokenTtlMinutes"], out var t) ? t : 60;
    }

    public string GenerateToken(string userId, string displayName, Guid channelId)
    {
        var token = new AccessToken(_apiKey, _apiSecret)
            .WithIdentity(userId)
            .WithName(displayName)
            .WithGrants(new VideoGrants
            {
                Room = channelId.ToString(),
                RoomJoin = true,
                CanPublish = true,
                CanSubscribe = true,
                CanPublishData = true,
                // Нужно для трансляции собственного состояния (deafened) через attributes.
                CanUpdateOwnMetadata = true,
            })
            .WithTtl(TimeSpan.FromMinutes(_ttlMinutes));

        return token.ToJwt();
    }
}
