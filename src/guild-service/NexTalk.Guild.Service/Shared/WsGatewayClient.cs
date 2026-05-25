using System.Net.Http.Json;
using System.Text.Json;

namespace NexTalk.Guild.Service.Shared;

public class WsGatewayClient
{
    // camelCase для совместимости с фронтендом (event.payload.userId).
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;

    public WsGatewayClient(HttpClient http)
    {
        _http = http;
    }

    public virtual Task BroadcastToGuildAsync(Guid guildId, string eventType, object payload, CancellationToken ct = default) =>
        _http.PostAsJsonAsync($"/internal/broadcast/guild/{guildId}", new { type = eventType, payload }, JsonOpts, ct);

    public virtual Task DisconnectUserFromGuildAsync(Guid guildId, string userId, CancellationToken ct = default) =>
        _http.PostAsJsonAsync($"/internal/disconnect/guild/{guildId}/user/{userId}", new { }, ct);
}
