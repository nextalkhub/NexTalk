namespace NextTalk.Websocket.Gateway.Infrastructure;

/// <summary>
/// HTTP-Клиент для internal эндпоинтов Guild Service
/// Отказоустойчивость настраивается через IHttpClientBuilder в Program.cs
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
    /// Проверяет, имеет ли пользователь как минимум роль Member в указанной гильдии.
    ///
    /// Эндпоинт: GET /internal/guilds/{guildId}/access?userId={userId}&requiredRole=Member
    /// </summary>
    public async Task<(bool HasAccess, string? Role)> CheckAccessAsync(
        Guid guildId, Guid userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/internal/guilds/{guildId}/access?userId={userId}&requiredRole=Member");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await _http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Guild check-access: guild={GuildId} user={UserId} status={Status} correlation={CorrelationId}",
                guildId, userId, (int)response.StatusCode, correlationId);
            return (false, null);
        }

        var result = await response.Content.ReadFromJsonAsync<AccessResult>(ct);
        return (result?.HasAccess ?? false, result?.Role);
    }

    /// <summary>
    /// Возвращает все серверы, в которых пользователь состоит. <br/>
    /// Эндпоинт: GET /internal/users/{userId}/guilds
    /// </summary>
    public async Task<IReadOnlyList<GuildDto>> GetUserGuildsAsync(
        Guid userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/internal/users/{userId}/guilds");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await _http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Guild get-user-guilds: user={UserId} status={Status} correlation={CorrelationId}",
                userId, (int)response.StatusCode, correlationId);
            return [];
        }

        return await response.Content.ReadFromJsonAsync<List<GuildDto>>(ct) ?? [];
    }

    private record AccessResult(bool HasAccess, string? Role);

    public record GuildDto(Guid Id, string Name, string DisplayName, Guid OwnerId, DateTime CreatedAt);
}
