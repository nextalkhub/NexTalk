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
        var url = config["LiveKit:Url"] ?? throw new InvalidOperationException("LiveKit:Url не задан.");
        var apiKey = config["LiveKit:ApiKey"] ?? throw new InvalidOperationException("LiveKit:ApiKey не задан.");
        var apiSecret = config["LiveKit:ApiSecret"] ?? throw new InvalidOperationException("LiveKit:ApiSecret не задан.");

        _client = new RoomServiceClient(url, apiKey, apiSecret);
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
                "LiveKit EnsureRoom: комната {ChannelId} — возможно уже существует, продолжаем.",
                channelId);
        }
    }

    /// <summary>
    /// Принудительно удаляет участника из LiveKit-комнаты.
    /// Игнорирует ошибки - если участника нет, LiveKit вернет ошибку, которую мы логируем и проглатываем.
    /// </summary>
    public async Task RemoveParticipantAsync(Guid channelId, Guid userId, CancellationToken ct = default)
    {
        try
        {
            await _client.RemoveParticipant(new RoomParticipantIdentity
            {
                Room = channelId.ToString(),
                Identity = userId.ToString(),
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "LiveKit RemoveParticipant: участник {UserId} не найден в комнате {ChannelId} — возможно уже отключён.",
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
                "LiveKit DeleteRoom: не удалось удалить комнату {ChannelId} — возможно уже не существует.",
                channelId);
        }
    }
}
