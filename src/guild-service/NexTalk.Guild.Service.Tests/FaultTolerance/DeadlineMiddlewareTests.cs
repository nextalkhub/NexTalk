using System.Net;
using System.Net.Http.Json;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Guild.Service.Tests.FaultTolerance;

/// <summary>
/// Проверяет DeadlineMiddleware: X-Deadline в прошлом → 504, в будущем/отсутствует/невалидный → пропускает.
/// </summary>
public class DeadlineMiddlewareTests : IAsyncLifetime
{
    private readonly GuildServiceFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    // /healthz - AllowAnonymous, отвечает быстро, удобна для теста middleware без бизнес-логики
    private const string ProbeUrl = "/healthz";

    [Fact]
    public async Task ExpiredDeadline_Returns504()
    {
        var client = _factory.CreateClient();
        var expired = DateTimeOffset.UtcNow.AddSeconds(-1).ToString("O");

        var req = new HttpRequestMessage(HttpMethod.Get, ProbeUrl);
        req.Headers.TryAddWithoutValidation("X-Deadline", expired);

        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
    }

    [Fact]
    public async Task FutureDeadline_ProcessesNormally()
    {
        var client = _factory.CreateClient();
        var future = DateTimeOffset.UtcNow.AddSeconds(10).ToString("O");

        var req = new HttpRequestMessage(HttpMethod.Get, ProbeUrl);
        req.Headers.TryAddWithoutValidation("X-Deadline", future);

        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task InvalidDeadlineFormat_Ignored_ProcessesNormally()
    {
        var client = _factory.CreateClient();

        var req = new HttpRequestMessage(HttpMethod.Get, ProbeUrl);
        req.Headers.TryAddWithoutValidation("X-Deadline", "not-a-date");

        var res = await client.SendAsync(req);

        // Middleware пропускает заголовок который не парсится как DateTimeOffset
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task NoDeadlineHeader_ProcessesNormally()
    {
        var client = _factory.CreateClient();

        var res = await client.GetAsync(ProbeUrl);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task ExpiredDeadline_ResponseBodyContainsError()
    {
        var client = _factory.CreateClient();
        var expired = DateTimeOffset.UtcNow.AddSeconds(-5).ToString("O");

        var req = new HttpRequestMessage(HttpMethod.Get, ProbeUrl);
        req.Headers.TryAddWithoutValidation("X-Deadline", expired);

        var res = await client.SendAsync(req);

        var body = await res.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Equal("Request timeout", body!.Error);
    }

    [Fact]
    public async Task ExpiredDeadline_AuthenticatedEndpoint_Returns504()
    {
        // Проверяем, что middleware срабатывает даже для защищенных эндпоинтов
        // (auth проходит, потом deadline → 504)
        var userId = Guid.NewGuid().ToString();
        var client = _factory.CreateAuthenticatedClient(userId);
        var expired = DateTimeOffset.UtcNow.AddSeconds(-1).ToString("O");

        var req = new HttpRequestMessage(HttpMethod.Post, "/internal/guilds");
        req.Content = JsonContent.Create(new { Name = "Test Guild" });
        req.Headers.TryAddWithoutValidation("X-Deadline", expired);

        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
    }

    private record ErrorResponse(string Error);
}
