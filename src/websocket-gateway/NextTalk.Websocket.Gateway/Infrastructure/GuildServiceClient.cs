using System.Net.Http.Json;

namespace NextTalk.Websocket.Gateway.Infrastructure;

/// <summary>
/// HTTP-клиент для внутренних эндпоинтов Guild Service.
/// Resilience (Retry + Circuit Breaker) настраивается на IHttpClientBuilder в Program.cs.
/// </summary>
public sealed class GuildServiceClient(HttpClient http, ILogger<GuildServiceClient> logger)
{
    /// <summary>
    /// Проверяет, есть ли у пользователя хотя бы роль Member в указанной гильдии.
    ///
    /// Эндпоинт: GET /internal/guilds/{guildId}/access?userId={userId}&amp;requiredRole=Member
    ///
    /// Примечание: в README §6 описан эндпоинт GET /internal/channels/{channelId}/check-access,
    /// но реальная реализация Guild Service работает с guildId, а не channelId.
    /// WS Gateway поэтому требует guildId от вызывающей стороны.
    /// </summary>
    public async Task<(bool HasAccess, string? Role)> CheckAccessAsync(
        Guid guildId, Guid userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/internal/guilds/{guildId}/access?userId={userId}&requiredRole=Member");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Guild check-access: guild={GuildId} user={UserId} status={Status} correlation={CorrelationId}",
                guildId, userId, (int)response.StatusCode, correlationId);
            return (false, null);
        }

        var result = await response.Content.ReadFromJsonAsync<AccessResult>(ct);
        return (result?.HasAccess ?? false, result?.Role);
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

    private record AccessResult(bool HasAccess, string? Role);

    public record GuildDto(Guid Id, string Name, string DisplayName, Guid OwnerId, DateTime CreatedAt);
}
