namespace NextTalk.Websocket.Gateway.Infrastructure;

public sealed class GuildServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GuildServiceClient> _logger;

    public GuildServiceClient(HttpClient http, ILogger<GuildServiceClient> logger)
    {
        _httpClient = http;
        _logger = logger;
    }

    /// <summary>
    /// Проверяет доступ пользователя к каналу и возвращает метаданные канала.
    /// </summary>
    public async Task<ChannelAccessResult?> CheckChannelAccessAsync(
        Guid channelId, string userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/internal/channels/{channelId}/access?userId={userId}");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await _httpClient.SendAsync(request, ct);

        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Guild channel-access: channel={ChannelId} user={UserId} status={Status} correlation={CorrelationId}",
                channelId, userId, (int)response.StatusCode, correlationId);
            return null;
        }

        return await response.Content.ReadFromJsonAsync<ChannelAccessResult>(ct);
    }

    /// <summary>
    /// Возвращает все серверы, в которых состоит пользователь.
    /// </summary>
    public async Task<IReadOnlyList<GuildDto>> GetUserGuildsAsync(
        string userId, string correlationId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/internal/users/{userId}/guilds");
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        using var response = await _httpClient.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "Guild get-user-guilds: user={UserId} status={Status} correlation={CorrelationId}",
                userId, (int)response.StatusCode, correlationId);
            return [];
        }

        return await response.Content.ReadFromJsonAsync<List<GuildDto>>(ct) ?? [];
    }

    public record ChannelAccessResult(bool HasAccess, Guid GuildId, string ChannelType, string? Role);

    public record GuildDto(Guid Id, string Name, string OwnerId, DateTimeOffset CreatedAt);
}
