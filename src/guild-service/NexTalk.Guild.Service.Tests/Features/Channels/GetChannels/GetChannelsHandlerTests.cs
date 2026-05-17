using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Channels.GetChannels;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared.Responses;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Channels.GetChannels;

public class GetChannelsHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task HandleAsync_GuildWithoutChannels_ReturnsEmptyList()
    {
        await using var db = CreateDb();
        var guildId = Guid.NewGuid();

        db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Empty Guild", DisplayName = "Empty Guild", OwnerId = Guid.NewGuid() });
        await db.SaveChangesAsync();

        var handler = new GetChannelsHandler(db);
        var query = new GetChannelsQuery(guildId);

        var result = await handler.HandleAsync(query);

        Assert.Empty(result);
    }

    [Fact]
    public async Task HandleAsync_GuildWithChannels_ReturnsAll()
    {
        await using var db = CreateDb();
        var guildId = Guid.NewGuid();

        db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", DisplayName = "Test Guild", OwnerId = Guid.NewGuid() });
        db.Channels.AddRange(
            new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "general", Type = "text" },
            new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "voice", Type = "voice" },
            new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "announcements", Type = "text" }
        );
        await db.SaveChangesAsync();

        var handler = new GetChannelsHandler(db);
        var query = new GetChannelsQuery(guildId);

        var result = await handler.HandleAsync(query);

        Assert.Equal(3, result.Count);
    }

    [Fact]
    public async Task HandleAsync_ReturnsCorrectChannelData()
    {
        await using var db = CreateDb();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", DisplayName = "Test Guild", OwnerId = Guid.NewGuid() });
        db.Channels.Add(new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = "text" });
        await db.SaveChangesAsync();

        var handler = new GetChannelsHandler(db);
        var query = new GetChannelsQuery(guildId);

        var result = await handler.HandleAsync(query);

        Assert.Single(result);
        var channel = result[0];
        Assert.Equal(channelId, channel.Id);
        Assert.Equal(guildId, channel.GuildId);
        Assert.Equal("test", channel.Name);
        Assert.Equal("text", channel.Type);
    }

    [Fact]
    public async Task HandleAsync_MultipleGuilds_ReturnsOnlyGuildChannels()
    {
        await using var db = CreateDb();
        var guildId1 = Guid.NewGuid();
        var guildId2 = Guid.NewGuid();

        db.Guilds.AddRange(
            new GuildEntity { Id = guildId1, Name = "Guild 1", DisplayName = "Guild 1", OwnerId = Guid.NewGuid() },
            new GuildEntity { Id = guildId2, Name = "Guild 2", DisplayName = "Guild 2", OwnerId = Guid.NewGuid() }
        );
        db.Channels.AddRange(
            new Channel { Id = Guid.NewGuid(), GuildId = guildId1, Name = "ch1", Type = "text" },
            new Channel { Id = Guid.NewGuid(), GuildId = guildId1, Name = "ch2", Type = "text" },
            new Channel { Id = Guid.NewGuid(), GuildId = guildId2, Name = "ch3", Type = "voice" }
        );
        await db.SaveChangesAsync();

        var handler = new GetChannelsHandler(db);
        var query = new GetChannelsQuery(guildId1);

        var result = await handler.HandleAsync(query);

        Assert.Equal(2, result.Count);
        Assert.All(result, ch => Assert.Equal(guildId1, ch.GuildId));
    }

    [Fact]
    public async Task HandleAsync_ReturnsTextAndVoiceChannels()
    {
        await using var db = CreateDb();
        var guildId = Guid.NewGuid();

        db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", DisplayName = "Test Guild", OwnerId = Guid.NewGuid() });
        db.Channels.AddRange(
            new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "text-ch", Type = "text" },
            new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "voice-ch", Type = "voice" }
        );
        await db.SaveChangesAsync();

        var handler = new GetChannelsHandler(db);
        var query = new GetChannelsQuery(guildId);

        var result = await handler.HandleAsync(query);

        Assert.Equal(2, result.Count);
        Assert.Contains(result, ch => ch.Type == "text");
        Assert.Contains(result, ch => ch.Type == "voice");
    }
}
