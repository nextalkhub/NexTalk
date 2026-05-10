using System.Net.Http.Json;

namespace NexTalk.Guild.Service.Shared;

public class WsGatewayClient(HttpClient http)
{
    public Task BroadcastToGuildAsync(Guid guildId, string eventType, object payload, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/broadcast/guild/{guildId}", new { EventType = eventType, Payload = payload }, ct);

    public Task DisconnectUserAsync(Guid userId, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/disconnect/user/{userId}", new { }, ct);

    public Task DisconnectUserFromGuildAsync(Guid guildId, Guid userId, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/disconnect/guild/{guildId}/user/{userId}", new { }, ct);
}
