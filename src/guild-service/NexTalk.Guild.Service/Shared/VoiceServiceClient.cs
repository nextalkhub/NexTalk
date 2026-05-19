namespace NexTalk.Guild.Service.Shared;

public class VoiceServiceClient
{
    private readonly HttpClient _http;

    public VoiceServiceClient(HttpClient http)
    {
        _http = http;
    }

    /// <summary>
    /// Принудительно отключает пользователя от голосового канала (при бане/кике).
    /// Идемпотентен: если пользователь не в голосе — Voice Service вернёт 204 без ошибки.
    /// </summary>
    public virtual Task DisconnectUserAsync(string userId, CancellationToken ct = default) =>
        _http.DeleteAsync($"/internal/voice/{userId}/disconnect", ct);

    /// <summary>
    /// Отключает всех участников от голосового канала и удаляет комнату в LiveKit.
    /// Используется при удалении канала или сервера.
    /// </summary>
    public virtual Task DisconnectAllFromChannelAsync(Guid channelId, CancellationToken ct = default) =>
        _http.DeleteAsync($"/internal/voice/channel/{channelId}/disconnect-all", ct);
}
