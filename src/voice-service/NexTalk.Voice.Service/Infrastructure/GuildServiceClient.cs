using System.Net.Http.Json;

namespace NexTalk.Voice.Service.Infrastructure;

/// <summary>
/// HTTP-клиент для внутренних эндпоинтов Guild Service.
/// Resilience (Retry + Circuit Breaker + Timeout) настраивается на IHttpClientBuilder в Program.cs.
/// </summary>
public sealed class GuildServiceClient
{
    private readonly HttpClient _http;
    private readonly ILogger<GuildServiceClient> _logger;

    public GuildServiceClient(HttpClient http, ILogger<GuildServiceClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <summary>
    /// Проверяет доступ пользователя к каналу и возвращает метаданные канала.
    /// Эндпоинт: GET /internal/channels/{channelId}/access?userId={userId}
    /// </summary>
    public async Task<ChannelAccessResult?> CheckChannelAccessAsync(
        Guid channelId, string userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/internal/channels/{channelId}/access?userId={userId}");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await _http.SendAsync(request, ct);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Guild check-channel-access: channel={ChannelId} user={UserId} status={Status} correlation={CorrelationId}",
                channelId, userId, (int)response.StatusCode, correlationId);
            return null;
        }

        return await response.Content.ReadFromJsonAsync<ChannelAccessResult>(ct);
    }

    public record ChannelAccessResult(bool HasAccess, Guid GuildId, string ChannelType, string? Role);
}
