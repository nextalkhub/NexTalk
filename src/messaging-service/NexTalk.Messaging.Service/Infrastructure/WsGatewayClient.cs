using System.Net.Http.Json;

namespace NexTalk.Messaging.Service.Infrastructure;

/// <summary>
/// HTTP-клиент для внутреннего эндпоинта WS Gateway.
/// Вызывается BroadcastConsumer после чтения события из канала.
/// Resilience настраивается на IHttpClientBuilder в Program.cs.
/// </summary>
public sealed class WsGatewayClient(HttpClient http, ILogger<WsGatewayClient> logger)
{
    /// <summary>
    /// Рассылает событие всем SignalR-клиентам в группе гильдии.
    /// Эндпоинт: POST /internal/broadcast/guild/{guildId}
    /// </summary>
    public async Task BroadcastToGuildAsync(
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
            Content = JsonContent.Create(new { Type = eventType, Payload = payload })
        };
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "WS Gateway broadcast failed: guild={GuildId} event={EventType} status={Status} correlation={CorrelationId}",
                guildId, eventType, (int)response.StatusCode, correlationId);
        }
    }
}
