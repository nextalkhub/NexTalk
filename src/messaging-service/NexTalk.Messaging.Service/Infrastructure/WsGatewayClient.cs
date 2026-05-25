using System.Net.Http.Json;
using System.Text.Json;

namespace NexTalk.Messaging.Service.Infrastructure;

/// <summary>
/// HTTP-клиент для внутреннего эндпоинта WS Gateway.
/// Вызывается BroadcastConsumer после чтения события из канала.
/// Resilience настраивается на IHttpClientBuilder в Program.cs.
/// </summary>
public class WsGatewayClient
{
    // camelCase: frontend ожидает event.payload.userId, а не event.payload.UserId.
    // BroadcastEndpoints передаёт JsonElement дальше как есть, поэтому case фиксируется здесь.
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;
    private readonly ILogger<WsGatewayClient> _logger;

    public WsGatewayClient(HttpClient http, ILogger<WsGatewayClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <summary>
    /// Рассылает событие всем SignalR-клиентам в группе гильдии.
    /// </summary>
    public virtual async Task BroadcastToGuildAsync(
        Guid guildId,
        string eventType,
        object payload,
        string correlationId,
        CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"/internal/broadcast/guild/{guildId}")
        {
            Content = JsonContent.Create(new { type = eventType, payload }, options: JsonOpts)
        };
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await _http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "WS Gateway broadcast failed: guild={GuildId} event={EventType} status={Status} correlation={CorrelationId}",
                guildId, eventType, (int)response.StatusCode, correlationId);
        }
    }
}
