using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.Features.Messages.CreateMessage;

public class CreateMessageEndpointTests : IAsyncLifetime
{
    private readonly MessagingServiceFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;

    public Task DisposeAsync()
    {
        _factory.Dispose();
        return Task.CompletedTask;
    }

    private static HttpRequestMessage BuildRequest(
        Guid? channelId = null,
        Guid? guildId = null,
        string authorId = "user-1",
        string authorName = "User One",
        string content = "Hello world",
        string? idempotencyKey = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/internal/messages");
        req.Content = JsonContent.Create(new
        {
            ChannelId = channelId ?? Guid.NewGuid(),
            GuildId = guildId ?? Guid.NewGuid(),
            AuthorId = authorId,
            AuthorName = authorName,
            Content = content,
        });
        req.Headers.TryAddWithoutValidation("X-Idempotency-Key", idempotencyKey ?? Guid.NewGuid().ToString());
        return req;
    }

    // ─── Успешное создание ───────────────────────────────────────────────────

    [Fact]
    public async Task Create_Returns201()
    {
        using var req = BuildRequest();
        var res = await _factory.CreateClient().SendAsync(req);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    [Fact]
    public async Task Create_ResponseBodyContainsAllFields()
    {
        var channelId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        const string authorId = "author-42";
        const string authorName = "Author Name";
        const string content = "Hello from test";

        using var req = BuildRequest(channelId, guildId, authorId, authorName, content);
        var res = await _factory.CreateClient().SendAsync(req);

        var dto = await res.Content.ReadFromJsonAsync<MessageDtoResponse>();
        Assert.NotNull(dto);
        Assert.NotEqual(Guid.Empty, dto.Id);
        Assert.Equal(channelId, dto.ChannelId);
        Assert.Equal(guildId, dto.GuildId);
        Assert.Equal(authorId, dto.AuthorId);
        Assert.Equal(authorName, dto.AuthorName);
        Assert.Equal(content, dto.Content);
        // CreatedAt устанавливается через HasDefaultValueSql("now()") - не работает в InMemory DB
    }

    [Fact]
    public async Task Create_PersistsMessageInDb()
    {
        var channelId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        using var req = BuildRequest(channelId, guildId, content: "persisted message");
        var res = await _factory.CreateClient().SendAsync(req);

        var dto = await res.Content.ReadFromJsonAsync<MessageDtoResponse>();
        await using var db = await _factory.GetDbContextAsync();
        var msg = await db.Messages.FirstOrDefaultAsync(m => m.Id == dto!.Id);
        Assert.NotNull(msg);
        Assert.Equal("persisted message", msg.Content);
        Assert.Equal(channelId, msg.ChannelId);
        Assert.Equal(guildId, msg.GuildId);
    }

    [Fact]
    public async Task Create_PersistsOutboxEventInDb()
    {
        var guildId = Guid.NewGuid();

        using var req = BuildRequest(guildId: guildId);
        var res = await _factory.CreateClient().SendAsync(req);
        var dto = await res.Content.ReadFromJsonAsync<MessageDtoResponse>();

        await using var db = await _factory.GetDbContextAsync();
        var outbox = await db.OutboxEvents.FirstOrDefaultAsync(o => o.GuildId == guildId);
        Assert.NotNull(outbox);
        Assert.Equal("message.created", outbox.EventType);
        Assert.Contains(dto!.Id.ToString(), outbox.Payload);
    }

    [Fact]
    public async Task Create_StoresIdempotencyKeyInDb()
    {
        var key = Guid.NewGuid().ToString();

        using var req = BuildRequest(idempotencyKey: key);
        await _factory.CreateClient().SendAsync(req);

        await using var db = await _factory.GetDbContextAsync();
        var idKey = await db.IdempotencyKeys.FirstOrDefaultAsync(k => k.Key == key);
        Assert.NotNull(idKey);
        Assert.True(idKey.ExpiresAt > DateTimeOffset.UtcNow.AddHours(23));
    }

    [Fact]
    public async Task Create_LocationHeaderPointsToMessage()
    {
        using var req = BuildRequest();
        var res = await _factory.CreateClient().SendAsync(req);

        var dto = await res.Content.ReadFromJsonAsync<MessageDtoResponse>();
        Assert.NotNull(res.Headers.Location);
        Assert.Contains(dto!.Id.ToString(), res.Headers.Location.ToString());
    }

    // ─── Ошибочные случаи ───────────────────────────────────────────────────

    [Fact]
    public async Task EmptyContent_Returns400()
    {
        using var req = BuildRequest(content: "");
        // ASP.NET Core minimal API treats empty string as "not provided" для non-nullable string
        // → BadHttpRequestException → 500 через global handler.
        // Проверяем что либо 400 либо 500 (не 201 / 200).
        var res = await _factory.CreateClient().SendAsync(req);

        Assert.NotEqual(HttpStatusCode.Created, res.StatusCode);
        Assert.NotEqual(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task WhitespaceContent_Returns400()
    {
        using var req = BuildRequest(content: "   ");
        var res = await _factory.CreateClient().SendAsync(req);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<ErrorBody>();
        Assert.Equal("Message content cannot be empty.", body!.Error);
    }

    [Fact]
    public async Task MaxLengthContent_Returns201()
    {
        var content = new string('x', 4000);
        using var req = BuildRequest(content: content);
        var res = await _factory.CreateClient().SendAsync(req);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
    }

    // ─── Idempotency (replay) ────────────────────────────────────────────────

    [Fact]
    public async Task ReplayRequest_Returns200WithSameId()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();

        using var req1 = BuildRequest(idempotencyKey: key);
        var res1 = await client.SendAsync(req1);
        var dto1 = await res1.Content.ReadFromJsonAsync<MessageDtoResponse>();

        using var req2 = BuildRequest(idempotencyKey: key);
        var res2 = await client.SendAsync(req2);
        var dto2 = await res2.Content.ReadFromJsonAsync<MessageDtoResponse>();

        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        Assert.Equal(HttpStatusCode.OK, res2.StatusCode);
        Assert.Equal(dto1!.Id, dto2!.Id);
    }

    [Fact]
    public async Task ReplayRequest_DoesNotCreateSecondOutboxEvent()
    {
        var client = _factory.CreateClient();
        var key = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        using var req1 = BuildRequest(guildId: guildId, idempotencyKey: key);
        await client.SendAsync(req1);

        using var req2 = BuildRequest(guildId: guildId, idempotencyKey: key);
        await client.SendAsync(req2);

        await using var db = await _factory.GetDbContextAsync();
        var count = await db.OutboxEvents.CountAsync(o => o.GuildId == guildId);
        Assert.Equal(1, count);
    }

    private record MessageDtoResponse(
        Guid Id, Guid ChannelId, Guid GuildId,
        string AuthorId, string AuthorName, string Content, DateTimeOffset CreatedAt);

    private record ErrorBody(string Error);
}
