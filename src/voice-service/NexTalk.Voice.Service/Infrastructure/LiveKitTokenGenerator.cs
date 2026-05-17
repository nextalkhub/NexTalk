using Livekit.Server.Sdk.Dotnet;

namespace NexTalk.Voice.Service.Infrastructure;

/// <summary>
/// Генерирует короткоживущий JWT для подключения клиента к LiveKit-комнате.
/// Токен даёт права на публикацию и подписку в рамках одной комнаты (channelId).
/// </summary>
public sealed class LiveKitTokenGenerator(IConfiguration config)
{
    private readonly string _apiKey = config["LiveKit:ApiKey"] ?? throw new InvalidOperationException("LiveKit:ApiKey не задан.");
    private readonly string _apiSecret = config["LiveKit:ApiSecret"] ?? throw new InvalidOperationException("LiveKit:ApiSecret не задан.");
    private readonly int _ttlMinutes = int.TryParse(config["LiveKit:TokenTtlMinutes"], out var t) ? t : 60;

    public string GenerateToken(Guid userId, string displayName, Guid channelId)
    {
        var token = new AccessToken(_apiKey, _apiSecret)
            .WithIdentity(userId.ToString())
            .WithName(displayName)
            .WithGrants(new VideoGrants
            {
                Room = channelId.ToString(),
                RoomJoin = true,
                CanPublish = true,
                CanSubscribe = true,
                CanPublishData = true,
            })
            .WithTtl(TimeSpan.FromMinutes(_ttlMinutes));

        return token.ToJwt();
    }
}
