using System.Net;

namespace NextTalk.Websocket.Gateway.Infrastructure;

public sealed class MessagingServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MessagingServiceClient> _logger;

    public MessagingServiceClient(HttpClient http, ILogger<MessagingServiceClient> logger)
    {
        _httpClient = http;
        _logger = logger;
    }


    /// <summary>
    /// Создает новое сообщение. Возвращает 201 при первом запросе или 200 (кэш) при повторном
    /// с тем же X-Idempotency-Key.
    /// </summary>
    public async Task<(bool Success, MessageDto? Message, string? Error)> CreateMessageAsync(
        CreateMessageRequest request,
        string idempotencyKey,
        string correlationId,
        CancellationToken ct = default)
    {
        // X-Deadline: ISO 8601 через 5 с — DeadlineMiddleware парсит через DateTimeOffset.TryParse.
        var deadline = DateTimeOffset.UtcNow.AddSeconds(5).ToString("O");

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        httpRequest.Content = JsonContent.Create(request);
        httpRequest.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);
        httpRequest.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
        httpRequest.Headers.TryAddWithoutValidation("X-Deadline", deadline);

        using var response = await _httpClient.SendAsync(httpRequest, ct);

        if (response.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK)
        {
            var msg = await response.Content.ReadFromJsonAsync<MessageDto>(ct);
            return (true, msg, null);
        }

        _logger.LogWarning(
            "Messaging create-message: channel={ChannelId} status={Status} correlation={CorrelationId}",
            request.ChannelId, (int)response.StatusCode, correlationId);

        return (false, null, $"Messaging service error: {(int)response.StatusCode}");
    }

    public record CreateMessageRequest(Guid ChannelId, Guid GuildId, string AuthorId, string AuthorName, string Content);

    public record MessageDto(
        Guid Id, Guid ChannelId, Guid GuildId, string AuthorId,
        string AuthorName, string Content, DateTimeOffset CreatedAt);
}
