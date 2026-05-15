using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;

namespace NexTalk.Messaging.Service.Shared;

public class GuildServiceClient(HttpClient http, IHttpContextAccessor httpContextAccessor) : IGuildServiceClient
{
    public async Task<ChannelAccessResult> CheckChannelAccessAsync(Guid channelId, Guid userId, CancellationToken ct = default)
    {
        var req = new HttpRequestMessage(HttpMethod.Get,
            $"/internal/channels/{channelId}/check-access?userId={userId}");

        // Propagate correlation headers for distributed tracing (Flow 11 step 5).
        var ctx = httpContextAccessor.HttpContext;
        if (ctx is not null)
        {
            var correlationId = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                ?? ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
                ?? ctx.TraceIdentifier;
            req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

            var deadline = ctx.Request.Headers["X-Deadline"].FirstOrDefault();
            if (!string.IsNullOrEmpty(deadline))
                req.Headers.TryAddWithoutValidation("X-Deadline", deadline);
        }

        using var resp = await http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();

        var result = await resp.Content.ReadFromJsonAsync<ChannelAccessResult>(ct);
        return result ?? new ChannelAccessResult(false, null);
    }
}
