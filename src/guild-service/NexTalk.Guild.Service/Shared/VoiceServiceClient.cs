namespace NexTalk.Guild.Service.Shared;

public class VoiceServiceClient(HttpClient http)
{
    /// <summary>
    /// Принудительно отключает пользователя от голосового канала (при бане/кике).
    /// Идемпотентен: если пользователь не в голосе — Voice Service вернёт 204 без ошибки.
    /// </summary>
    public Task DisconnectUserAsync(Guid userId, CancellationToken ct = default) =>
        http.DeleteAsync($"/internal/voice/{userId}/disconnect", ct);

    /// <summary>
    /// Отключает всех участников от голосового канала и удаляет комнату в LiveKit.
    /// Используется при удалении канала или сервера.
    /// </summary>
    public Task DisconnectAllFromChannelAsync(Guid channelId, CancellationToken ct = default) =>
        http.DeleteAsync($"/internal/voice/channel/{channelId}/disconnect-all", ct);
}
