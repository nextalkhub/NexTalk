using System.Net;
using System.Net.Http.Json;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.FaultTolerance;

public class DeadlineTests : IAsyncLifetime
{
    private readonly MessagingServiceFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    private static HttpRequestMessage BuildCreateMessage(string? deadline = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        req.Content = JsonContent.Create(new
        {
            ChannelId = Guid.NewGuid(),
            GuildId = Guid.NewGuid(),
            AuthorId = "user-1",
            AuthorName = "User One",
            Content = "hello",
        });
        req.Headers.TryAddWithoutValidation("X-Idempotency-Key", Guid.NewGuid().ToString());
        if (deadline is not null)
            req.Headers.TryAddWithoutValidation("X-Deadline", deadline);
        return req;
    }

    [Fact]
    public async Task ExpiredDeadline_Returns504()
    {
        var client = _factory.CreateClient();
        var expired = DateTimeOffset.UtcNow.AddSeconds(-1).ToString("O");

        using var req = BuildCreateMessage(expired);
        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.GatewayTimeout, res.StatusCode);
    }

    [Fact]
    public async Task FutureDeadline_ProcessesNormally()
    {
        var client = _factory.CreateClient();
        var future = DateTimeOffset.UtcNow.AddSeconds(10).ToString("O");

        using var req = BuildCreateMessage(future);
        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    [Fact]
    public async Task InvalidDeadlineFormat_Ignored_ProcessesNormally()
    {
        var client = _factory.CreateClient();

        using var req = BuildCreateMessage("not-a-date");
        var res = await client.SendAsync(req);

        // Middleware пропускает невалидный заголовок
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    [Fact]
    public async Task NoDeadlineHeader_ProcessesNormally()
    {
        var client = _factory.CreateClient();

        using var req = BuildCreateMessage();
        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    [Fact]
    public async Task ExpiredDeadline_ResponseBodyContainsError()
    {
        var client = _factory.CreateClient();
        var expired = DateTimeOffset.UtcNow.AddSeconds(-5).ToString("O");

        using var req = BuildCreateMessage(expired);
        var res = await client.SendAsync(req);

        var body = await res.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.Equal("Request timeout", body!.Error);
    }

    private record ErrorResponse(string Error);
}
