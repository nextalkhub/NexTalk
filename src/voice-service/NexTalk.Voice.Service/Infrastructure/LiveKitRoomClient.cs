using Livekit.Server.Sdk.Dotnet;

namespace NexTalk.Voice.Service.Infrastructure;

/// <summary>
/// Обертка над LiveKit RoomServiceClient.
/// Инкапсулирует вызовы HTTP API LiveKit: создание/удаление комнат, удаление участников.
/// </summary>
public sealed class LiveKitRoomClient
{
    private readonly RoomServiceClient _client;
    private readonly ILogger<LiveKitRoomClient> _logger;

    public LiveKitRoomClient(IConfiguration config, ILogger<LiveKitRoomClient> logger)
    {
        var url = config["LiveKit:Url"] ?? throw new InvalidOperationException("LiveKit:Url is not configured.");
        var apiKey = config["LiveKit:ApiKey"] ?? throw new InvalidOperationException("LiveKit:ApiKey is not configured.");
        var secretKey = config["LiveKit:SecretKey"] ?? throw new InvalidOperationException("LiveKit:SecretKey is not configured.");

        _client = new RoomServiceClient(url, apiKey, secretKey);
        _logger = logger;
    }

    /// <summary>
    /// Создает комнату для канала, если она еще не существует.
    /// LiveKit сам обеспечивает идемпотентность: повторный вызов не выбрасывает исключение.
    /// </summary>
    public async Task EnsureRoomAsync(Guid channelId, CancellationToken ct = default)
    {
        try
        {
            await _client.CreateRoom(new CreateRoomRequest { Name = channelId.ToString() });
        }
        catch (Exception ex)
        {
            // Комната уже существует или другая несмертельная ошибка.
            // Клиент всё равно сможет подключиться - LiveKit создаст комнату при первом join.
            _logger.LogWarning(ex,
                "LiveKit EnsureRoom: room {ChannelId} may already exist, continuing.",
                channelId);
        }
    }

    /// <summary>
    /// Принудительно удаляет участника из LiveKit-комнаты.
    /// Игнорирует ошибки - если участника нет, LiveKit вернет ошибку, которую мы логируем и проглатываем.
    /// </summary>
    public async Task RemoveParticipantAsync(Guid channelId, string userId, CancellationToken ct = default)
    {
        try
        {
            await _client.RemoveParticipant(new RoomParticipantIdentity
            {
                Room = channelId.ToString(),
                Identity = userId,
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "LiveKit RemoveParticipant: participant {UserId} not found in room {ChannelId}, may have already disconnected.",
                userId, channelId);
        }
    }

    /// <summary>
    /// Удаляет всю LiveKit-комнату и отключает всех участников.
    /// </summary>
    public async Task DeleteRoomAsync(Guid channelId, CancellationToken ct = default)
    {
        try
        {
            await _client.DeleteRoom(new DeleteRoomRequest { Room = channelId.ToString() });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "LiveKit DeleteRoom: failed to delete room {ChannelId}, may not exist.",
                channelId);
        }
    }
}
