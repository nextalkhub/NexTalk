using System.Net.Http.Json;

namespace NexTalk.Guild.Service.Shared;

public class VoiceServiceClient(HttpClient http)
{
    public Task DisconnectAllFromChannelAsync(Guid channelId, CancellationToken ct = default) =>
        http.PostAsJsonAsync($"/internal/channels/{channelId}/disconnect-all", new { }, ct);
}
