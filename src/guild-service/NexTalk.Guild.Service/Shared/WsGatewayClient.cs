using System.Net.Http.Json;

namespace NexTalk.Guild.Service.Shared;

public class WsGatewayClient(HttpClient http)
{
    public virtual Task BroadcastToGuildAsync(Guid guildId, string eventType, object payload, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/broadcast/guild/{guildId}", new { Type = eventType, Payload = payload }, ct);

    public virtual Task DisconnectUserAsync(Guid userId, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/disconnect/{userId}", new { }, ct);

    public virtual Task DisconnectUserFromGuildAsync(Guid guildId, Guid userId, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/disconnect/guild/{guildId}/user/{userId}", new { }, ct);
}
