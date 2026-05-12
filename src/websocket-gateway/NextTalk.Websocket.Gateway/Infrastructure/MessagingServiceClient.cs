using System.Net;
using System.Net.Http.Json;

namespace NextTalk.Websocket.Gateway.Infrastructure;

/// <summary>
/// HTTP-клиент для internal эндпоинтов Message Service
/// POST /internal/messages идемпотентен через X-Idempotency-Key, поэтому retry безопасны
/// </summary>
public sealed class MessagingServiceClient
{
    private readonly HttpClient _http;
    private readonly ILogger<MessagingServiceClient> _logger;
    
    public MessagingServiceClient(HttpClient http, ILogger<MessagingServiceClient> logger)
    {
        _http = http;
        _logger = logger;
    }
    
    /// <summary>
    /// Создает сообщение. Возвращает сохраненное сообщение при 201, или закэшированный
    /// ответ при 200 (идемпотентное воспроизведение Messaging Service)
    /// </summary>
    public async Task<(bool Success, MessageDto? Message, string? Error)> CreateMessageAsync(
        CreateMessageRequest request,
        string idempotencyKey,
        string correlationId,
        CancellationToken ct = default)
    {
        // X-Deadline: UTC epoch ms, 5 с вперед - пробрасывается в deadline middleware Messaging Service
        var deadline = DateTimeOffset.UtcNow.AddSeconds(5).ToUnixTimeMilliseconds().ToString();

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        httpRequest.Content = JsonContent.Create(request);
        
        httpRequest.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);
        httpRequest.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);
        httpRequest.Headers.TryAddWithoutValidation("X-Deadline", deadline);
        
        using var responce = await _http.SendAsync(httpRequest, ct);

        if (responce.StatusCode is HttpStatusCode.Created or HttpStatusCode.OK)
        {
            var message = await responce.Content.ReadFromJsonAsync<MessageDto>(ct);
            return (true, message, null);
        }
        
        _logger.LogWarning(
            "Messaging create-message: channel={ChannelId} status={Status} correlation={CorrelationId}",
            request.ChannelId, (int)responce.StatusCode, correlationId);

        return (false, null, $"Messaging service error: {(int)responce.StatusCode}");
    }

    public record CreateMessageRequest(Guid ChannelId, Guid AuthorId, string AuthorName, string Content);
    
    public record MessageDto(
        Guid Id, Guid ChannelId, Guid AuthorId,
        string AuthorName, string Content, DateTime CreatedAt);
}
