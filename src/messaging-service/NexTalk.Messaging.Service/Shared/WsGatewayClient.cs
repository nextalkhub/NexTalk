using System.Net.Http.Json;

namespace NexTalk.Messaging.Service.Shared;

public class WsGatewayClient(HttpClient http)
{
    public virtual Task BroadcastToChannelAsync(Guid channelId, string eventType, object payload, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/broadcast/channel/{channelId}", new { EventType = eventType, Payload = payload }, ct);
}
