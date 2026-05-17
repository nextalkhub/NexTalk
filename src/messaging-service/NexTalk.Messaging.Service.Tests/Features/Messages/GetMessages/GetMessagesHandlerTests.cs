using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;
using NexTalk.Messaging.Service.Features.Messages.GetMessages;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.Features.Messages.GetMessages;

public class GetMessagesHandlerTests
{
    private static MessagingDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<MessagingDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static GetMessagesHandler CreateHandler(
        MessagingDbContext db,
        bool allowed = true,
        Guid? guildId = null) =>
        new(db, new FakeGuildServiceClient(new ChannelAccessResult(allowed, guildId ?? Guid.NewGuid())));

    private static async Task<Guid> SeedMessageAsync(MessagingDbContext db, Guid channelId, DateTime createdAt, string content = "msg")
    {
        var msg = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            GuildId = Guid.NewGuid(),
            AuthorId = Guid.NewGuid(),
            AuthorName = "Author",
            Content = content,
            CreatedAt = createdAt
        };
        db.Messages.Add(msg);
        await db.SaveChangesAsync();
        return msg.Id;
    }

    [Fact]
    public async Task Handle_WhenChannelNotFound_ThrowsNotFound()
    {
        await using var db = CreateDb();
        var handler = new GetMessagesHandler(db,
            new FakeGuildServiceClient(new ChannelAccessResult(false, null)));

        var query = new GetMessagesQuery(Guid.NewGuid(), Guid.NewGuid(), null, 50);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(query));
    }

    [Fact]
    public async Task Handle_WhenUserHasNoAccess_ThrowsForbidden()
    {
        await using var db = CreateDb();
        var handler = new GetMessagesHandler(db,
            new FakeGuildServiceClient(new ChannelAccessResult(false, Guid.NewGuid())));

        var query = new GetMessagesQuery(Guid.NewGuid(), Guid.NewGuid(), null, 50);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(query));
    }

    [Fact]
    public async Task Handle_WithAccess_ReturnsMessagesNewestFirst()
    {
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow;

        await SeedMessageAsync(db, channelId, baseTime.AddMinutes(-2), "oldest");
        await SeedMessageAsync(db, channelId, baseTime.AddMinutes(-1), "middle");
        await SeedMessageAsync(db, channelId, baseTime, "newest");

        var result = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), null, 50));

        Assert.Equal(3, result.Messages.Count);
        Assert.Equal("newest", result.Messages[0].Content);
        Assert.Equal("middle", result.Messages[1].Content);
        Assert.Equal("oldest", result.Messages[2].Content);
        Assert.Null(result.NextCursor);
    }

    [Fact]
    public async Task Handle_FiltersByChannelId()
    {
        await using var db = CreateDb();
        var channelA = Guid.NewGuid();
        var channelB = Guid.NewGuid();
        var now = DateTime.UtcNow;

        await SeedMessageAsync(db, channelA, now, "a-msg");
        await SeedMessageAsync(db, channelB, now, "b-msg");

        var result = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelA, Guid.NewGuid(), null, 50));

        Assert.Single(result.Messages);
        Assert.Equal("a-msg", result.Messages[0].Content);
    }

    [Fact]
    public async Task Handle_RespectsLimit_AndReturnsNextCursor()
    {
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow;

        for (var i = 0; i < 5; i++)
            await SeedMessageAsync(db, channelId, baseTime.AddSeconds(i), $"msg{i}");

        var result = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), null, 3));

        Assert.Equal(3, result.Messages.Count);
        Assert.NotNull(result.NextCursor);
        // Cursor is the id of the last returned message (oldest in current page)
        Assert.Equal(result.Messages[^1].Id, result.NextCursor);
    }

    [Fact]
    public async Task Handle_NextCursorIsNull_WhenLastPage()
    {
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow;

        for (var i = 0; i < 2; i++)
            await SeedMessageAsync(db, channelId, baseTime.AddSeconds(i), $"msg{i}");

        var result = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), null, 50));

        Assert.Equal(2, result.Messages.Count);
        Assert.Null(result.NextCursor);
    }

    [Fact]
    public async Task Handle_WithCursor_ReturnsOlderMessages()
    {
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow;

        var ids = new List<Guid>();
        for (var i = 0; i < 5; i++)
            ids.Add(await SeedMessageAsync(db, channelId, baseTime.AddSeconds(i), $"msg{i}"));

        // First page: newest 2 (msg4, msg3); cursor = msg3.Id
        var firstPage = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), null, 2));
        Assert.Equal("msg4", firstPage.Messages[0].Content);
        Assert.Equal("msg3", firstPage.Messages[1].Content);

        // Second page: messages older than cursor → msg2, msg1
        var secondPage = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), firstPage.NextCursor, 2));

        Assert.Equal(2, secondPage.Messages.Count);
        Assert.Equal("msg2", secondPage.Messages[0].Content);
        Assert.Equal("msg1", secondPage.Messages[1].Content);
    }

    [Fact]
    public async Task Handle_WithCursorReachingStart_ReturnsNullCursor()
    {
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        var baseTime = DateTime.UtcNow;

        for (var i = 0; i < 3; i++)
            await SeedMessageAsync(db, channelId, baseTime.AddSeconds(i), $"msg{i}");

        var firstPage = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), null, 2));

        var secondPage = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), firstPage.NextCursor, 2));

        Assert.Single(secondPage.Messages);
        Assert.Null(secondPage.NextCursor);
    }

    [Fact]
    public async Task Handle_WithUnknownCursor_FallsBackToLatest()
    {
        // If the cursor id doesn't exist in DB, the handler ignores it and returns latest messages.
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        await SeedMessageAsync(db, channelId, DateTime.UtcNow, "only");

        var result = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(channelId, Guid.NewGuid(), Guid.NewGuid(), 50));

        Assert.Single(result.Messages);
        Assert.Equal("only", result.Messages[0].Content);
    }

    [Fact]
    public async Task Handle_PassesQueriedUserIdToGuildClient()
    {
        await using var db = CreateDb();
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var fake = new FakeGuildServiceClient(new ChannelAccessResult(true, Guid.NewGuid()));
        var handler = new GetMessagesHandler(db, fake);

        await handler.HandleAsync(new GetMessagesQuery(channelId, userId, null, 50));

        Assert.Equal(1, fake.CallCount);
        Assert.Equal(channelId, fake.LastChannelId);
        Assert.Equal(userId, fake.LastUserId);
    }

    [Fact]
    public async Task Handle_ReturnsEmpty_WhenNoMessagesInChannel()
    {
        await using var db = CreateDb();
        var result = await CreateHandler(db).HandleAsync(
            new GetMessagesQuery(Guid.NewGuid(), Guid.NewGuid(), null, 50));

        Assert.Empty(result.Messages);
        Assert.Null(result.NextCursor);
    }
}
