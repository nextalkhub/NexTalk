using System.Net;
using System.Net.Http.Json;

namespace NextTalk.Websocket.Gateway.Infrastructure;

/// <summary>
/// HTTP-клиент для внутренних эндпоинтов Messaging Service.
/// Resilience (Retry + Circuit Breaker) настраивается на IHttpClientBuilder в Program.cs.
/// POST /internal/messages идемпотентен через X-Idempotency-Key, поэтому повторы безопасны.
/// </summary>
public sealed class MessagingServiceClient(HttpClient http, ILogger<MessagingServiceClient> logger)
{
    /// <summary>
    /// Создаёт новое сообщение. Возвращает 201 при первом запросе или 200 (кэш) при повторном
    /// с тем же X-Idempotency-Key.
    /// </summary>
    public async Task<(bool Success, MessageDto? Message, string? Error)> CreateMessageAsync(
        CreateMessageRequest request,
        string idempotencyKey,
        string correlationId,
        CancellationToken ct = default)
    {
        // X-Deadline: UTC epoch в мс, через 5 с — пробрасывается в Messaging Service для deadline middleware.
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

    public record CreateMessageRequest(Guid ChannelId, Guid GuildId, Guid AuthorId, string AuthorName, string Content);

    public record MessageDto(
        Guid Id, Guid ChannelId, Guid GuildId, Guid AuthorId,
        string AuthorName, string Content, DateTime CreatedAt);
}
