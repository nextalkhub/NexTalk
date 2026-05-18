using System.Net.Http.Json;

namespace NexTalk.Guild.Service.Shared;

public class WsGatewayClient
{
    private readonly HttpClient _http;

    public WsGatewayClient(HttpClient http)
    {
        _http = http;
    }

    public virtual Task BroadcastToGuildAsync(Guid guildId, string eventType, object payload, CancellationToken ct = default) =>
        _http.PostAsJsonAsync($"/internal/broadcast/guild/{guildId}", new { Type = eventType, Payload = payload }, ct);

    public virtual Task DisconnectUserFromGuildAsync(Guid guildId, string userId, CancellationToken ct = default) =>
        _http.PostAsJsonAsync($"/internal/disconnect/guild/{guildId}/user/{userId}", new { }, ct);
}
