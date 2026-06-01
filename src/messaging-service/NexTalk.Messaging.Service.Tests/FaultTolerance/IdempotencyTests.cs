using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.FaultTolerance;

public class IdempotencyTests : IAsyncLifetime
{
    private readonly MessagingServiceFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    private static object BuildBody(Guid channelId, Guid guildId) => new
    {
        ChannelId = channelId,
        GuildId = guildId,
        AuthorId = "user-1",
        AuthorName = "User One",
        Content = "hello world",
    };

    private static HttpRequestMessage BuildRequest(object body, string idempotencyKey)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        req.Content = JsonContent.Create(body);
        req.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey);
        return req;
    }

    [Fact]
    public async Task FirstRequest_Returns201()
    {
        var client = _factory.CreateClient();
        var body = BuildBody(Guid.NewGuid(), Guid.NewGuid());

        using var req = BuildRequest(body, Guid.NewGuid().ToString());
        var res = await client.SendAsync(req);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    [Fact]
    public async Task DuplicateKey_SecondRequest_Returns200()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();
        var body = BuildBody(Guid.NewGuid(), Guid.NewGuid());

        using var req1 = BuildRequest(body, key);
        await client.SendAsync(req1);

        using var req2 = BuildRequest(body, key);
        var res2 = await client.SendAsync(req2);

        Assert.Equal(HttpStatusCode.OK, res2.StatusCode);
    }

    [Fact]
    public async Task DuplicateKey_ReturnsSameMessageId()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();
        var body = BuildBody(Guid.NewGuid(), Guid.NewGuid());

        using var req1 = BuildRequest(body, key);
        var res1 = await client.SendAsync(req1);

        using var req2 = BuildRequest(body, key);
        var res2 = await client.SendAsync(req2);

        var dto1 = await res1.Content.ReadFromJsonAsync<MessageDtoResponse>();
        var dto2 = await res2.Content.ReadFromJsonAsync<MessageDtoResponse>();
        Assert.Equal(dto1!.Id, dto2!.Id);
    }

    [Fact]
    public async Task DuplicateKey_CreatesOnlyOneMessageInDb()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();
        var channelId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var body = BuildBody(channelId, guildId);

        using var req1 = BuildRequest(body, key);
        await client.SendAsync(req1);

        using var req2 = BuildRequest(body, key);
        await client.SendAsync(req2);

        await using var db = await _factory.GetDbContextAsync();
        var count = await db.Messages.CountAsync(m => m.ChannelId == channelId && m.GuildId == guildId);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task UniqueKeys_CreateSeparateMessages()
    {
        var client = _factory.CreateClient();
        var channelId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var body = BuildBody(channelId, guildId);

        using var req1 = BuildRequest(body, Guid.NewGuid().ToString());
        var res1 = await client.SendAsync(req1);

        using var req2 = BuildRequest(body, Guid.NewGuid().ToString());
        var res2 = await client.SendAsync(req2);

        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        Assert.Equal(HttpStatusCode.Created, res2.StatusCode);

        await using var db = await _factory.GetDbContextAsync();
        var count = await db.Messages.CountAsync(m => m.ChannelId == channelId && m.GuildId == guildId);
        Assert.Equal(2, count);
    }

    private record MessageDtoResponse(Guid Id);
}
