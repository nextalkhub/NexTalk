using System.Net.Http.Json;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using Serilog.Events;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.Logging;

/// <summary>
/// Проверяет, что messaging-service эмитирует нужные структурированные лог-события.
/// </summary>
public class CreateMessageLoggingTests : IAsyncLifetime
{
    private readonly LoggingMessagingServiceFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    private static HttpRequestMessage BuildRequest(string? idempotencyKey = null, string content = "hello")
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        req.Content = JsonContent.Create(new
        {
            ChannelId = Guid.NewGuid(),
            GuildId = Guid.NewGuid(),
            AuthorId = "user-log-test",
            AuthorName = "Log Tester",
            Content = content,
        });
        req.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey ?? Guid.NewGuid().ToString());
        return req;
    }

    [Fact]
    public async Task CreateMessage_EmitsCreatedLog()
    {
        using var req = BuildRequest();
        await _factory.CreateClient().SendAsync(req);

        Assert.True(_factory.LogSink.HasMessageTemplate("Message created:"),
            "Ожидался лог «Message created:» при создании сообщения");
    }

    [Fact]
    public async Task CreateMessage_LogContainsChannelId()
    {
        var channelId = Guid.NewGuid();
        var req = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        req.Content = JsonContent.Create(new
        {
            ChannelId = channelId,
            GuildId = Guid.NewGuid(),
            AuthorId = "u1",
            AuthorName = "U1",
            Content = "test",
        });
        req.Headers.TryAddWithoutValidation("X-Idempotency-Key", Guid.NewGuid().ToString());
        await _factory.CreateClient().SendAsync(req);

        Assert.True(_factory.LogSink.HasPropertyValue("ChannelId", channelId.ToString()),
            "Ожидалось свойство ChannelId в логе");
    }

    [Fact]
    public async Task CreateMessage_LogLevel_IsInformation()
    {
        using var req = BuildRequest();
        await _factory.CreateClient().SendAsync(req);

        Assert.True(_factory.LogSink.HasLevel(LogEventLevel.Information, "Message created:"),
            "Лог «Message created:» должен быть уровня Information");
    }

    [Fact]
    public async Task IdempotencyReplay_EmitsIdempotencyHitLog()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();

        using var req1 = BuildRequest(key);
        await client.SendAsync(req1);

        using var req2 = BuildRequest(key);
        await client.SendAsync(req2);

        Assert.True(_factory.LogSink.HasMessageTemplate("Idempotency hit:"),
            "Ожидался лог «Idempotency hit:» при повторном запросе с тем же ключом");
    }

    [Fact]
    public async Task IdempotencyReplay_LogContainsKey()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();

        using var req1 = BuildRequest(key);
        await client.SendAsync(req1);

        using var req2 = BuildRequest(key);
        await client.SendAsync(req2);

        Assert.True(_factory.LogSink.HasPropertyValue("Key", key),
            "Ожидалось свойство Key в логе idempotency hit");
    }

    [Fact]
    public async Task CreateMessage_NoErrorLogs_OnHappyPath()
    {
        using var req = BuildRequest();
        await _factory.CreateClient().SendAsync(req);

        var errors = _factory.LogSink.Events
            .Where(e => e.Level >= LogEventLevel.Error)
            .ToList();

        Assert.Empty(errors);
    }

    [Fact]
    public async Task WhitespaceContent_EmitsNoCreatedLog()
    {
        using var req = BuildRequest(content: "   ");
        await _factory.CreateClient().SendAsync(req);

        Assert.False(_factory.LogSink.HasMessageTemplate("Message created:"),
            "Лог «Message created:» не должен эмититься при невалидном контенте");
    }
}
