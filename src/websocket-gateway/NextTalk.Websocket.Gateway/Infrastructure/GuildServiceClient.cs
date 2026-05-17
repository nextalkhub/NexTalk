using System.Net.Http.Json;

namespace NextTalk.Websocket.Gateway.Infrastructure;

/// <summary>
/// HTTP-клиент для внутренних эндпоинтов Guild Service.
/// Resilience (Retry + Circuit Breaker) настраивается на IHttpClientBuilder в Program.cs.
/// </summary>
public sealed class GuildServiceClient(HttpClient http, ILogger<GuildServiceClient> logger)
{
    /// <summary>
    /// Проверяет доступ пользователя к каналу и возвращает метаданные канала.
    /// Эндпоинт: GET /internal/channels/{channelId}/access?userId={userId}
    /// </summary>
    public async Task<ChannelAccessResult?> CheckChannelAccessAsync(
        Guid channelId, Guid userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/internal/channels/{channelId}/access?userId={userId}");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await http.SendAsync(request, ct);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Guild channel-access: channel={ChannelId} user={UserId} status={Status} correlation={CorrelationId}",
                channelId, userId, (int)response.StatusCode, correlationId);
            return null;
        }

        return await response.Content.ReadFromJsonAsync<ChannelAccessResult>(ct);
    }

    /// <summary>
    /// Возвращает все серверы, в которых состоит пользователь.
    /// Эндпоинт: GET /internal/users/{userId}/guilds
    /// </summary>
    public async Task<IReadOnlyList<GuildDto>> GetUserGuildsAsync(
        Guid userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/internal/users/{userId}/guilds");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Guild get-user-guilds: user={UserId} status={Status} correlation={CorrelationId}",
                userId, (int)response.StatusCode, correlationId);
            return [];
        }

        return await response.Content.ReadFromJsonAsync<List<GuildDto>>(ct) ?? [];
    }

    public record ChannelAccessResult(bool HasAccess, Guid GuildId, string ChannelType, string? Role);

    public record GuildDto(Guid Id, string Name, string DisplayName, Guid OwnerId, DateTime CreatedAt);
}
