using System.Net;
using System.Net.Http.Json;

namespace NextTalk.Websocket.Gateway.Infrastructure;

/// <summary>
/// HTTP client for Messaging Service internal endpoints.
/// Resilience (Retry + Circuit Breaker) is configured on the IHttpClientBuilder in Program.cs.
/// POST /internal/messages is idempotent via X-Idempotency-Key, so retries are safe.
/// </summary>
public sealed class MessagingServiceClient(HttpClient http, ILogger<MessagingServiceClient> logger)
{
    /// <summary>
    /// Creates a new message. Returns the persisted message on 201, or the cached
    /// response on 200 (idempotent replay by Messaging Service).
    /// </summary>
    public async Task<(bool Success, MessageDto? Message, string? Error)> CreateMessageAsync(
        CreateMessageRequest request,
        string idempotencyKey,
        string correlationId,
        CancellationToken ct = default)
    {
        // X-Deadline: UTC epoch ms, 5 s from now — propagated to Messaging Service deadline middleware.
        var deadline = DateTimeOffset.UtcNow.AddSeconds(5).ToUnixTimeMilliseconds().ToString();

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/internal/messages")
        {
            Content = JsonContent.Create(request)
        };
        httpRequest.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);
        httpRequest.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
        httpRequest.Headers.TryAddWithoutValidation("X-Deadline", deadline);

        using var response = await http.SendAsync(httpRequest, ct);

        if (response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK)
        {
            var msg = await response.Content.ReadFromJsonAsync<MessageDto>(ct);
            return (true, msg, null);
        }

        logger.LogWarning(
            "Messaging create-message: channel={ChannelId} status={Status} correlation={CorrelationId}",
            request.ChannelId, (int)response.StatusCode, correlationId);

        return (false, null, $"Messaging service error: {(int)response.StatusCode}");
    }

    public record CreateMessageRequest(Guid ChannelId, Guid AuthorId, string AuthorName, string Content);

    public record MessageDto(
        Guid Id, Guid ChannelId, Guid AuthorId,
        string AuthorName, string Content, DateTime CreatedAt);
}
