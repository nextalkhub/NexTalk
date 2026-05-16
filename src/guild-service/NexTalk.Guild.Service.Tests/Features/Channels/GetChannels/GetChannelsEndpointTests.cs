using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Channels.GetChannels;

public class GetChannelsEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private static void Authorize(HttpClient client, Guid userId) =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId, "Test User", "testuser"));

    [Fact]
    public async Task GetChannels_WithoutToken_Returns401()
    {
        var guildId = Guid.NewGuid();
        var response = await NewClient().GetAsync($"/guilds/{guildId}/channels");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetChannels_NonexistentGuild_ReturnsEmptyList()
    {
        var client = NewClient();
        var userId = Guid.NewGuid();
        Authorize(client, userId);

        var response = await client.GetAsync($"/guilds/{Guid.NewGuid()}/channels");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ChannelDto[]>();
        Assert.NotNull(body);
        Assert.Empty(body);
    }

    [Fact]
    public async Task GetChannels_GuildWithoutChannels_ReturnsEmptyList()
    {
        var guildId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Empty Guild", DisplayName = "Empty Guild", OwnerId = userId });
            db.Members.Add(new Member { UserId = userId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, userId);

        var response = await client.GetAsync($"/guilds/{guildId}/channels");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ChannelDto[]>();
        Assert.NotNull(body);
        Assert.Empty(body);
    }

    [Fact]
    public async Task GetChannels_GuildWithChannels_ReturnsAll()
    {
        var guildId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", DisplayName = "Test Guild", OwnerId = userId });
            db.Members.Add(new Member { UserId = userId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            db.Channels.AddRange(
                new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "general", Type = "text" },
                new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "voice-room", Type = "voice" },
                new Channel { Id = Guid.NewGuid(), GuildId = guildId, Name = "announcements", Type = "text" }
            );
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, userId);

        var response = await client.GetAsync($"/guilds/{guildId}/channels");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ChannelDto[]>();
        Assert.NotNull(body);
        Assert.Equal(3, body.Length);
    }

    [Fact]
    public async Task GetChannels_ReturnsCorrectChannelData()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var userId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", DisplayName = "Test Guild", OwnerId = userId });
            db.Members.Add(new Member { UserId = userId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            db.Channels.Add(new Channel { Id = channelId, GuildId = guildId, Name = "test-channel", Type = "text" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, userId);

        var response = await client.GetAsync($"/guilds/{guildId}/channels");

        var body = await response.Content.ReadFromJsonAsync<ChannelDto[]>();
        Assert.NotNull(body);
        Assert.Single(body);

        var channel = body[0];
        Assert.Equal(channelId, channel.Id);
        Assert.Equal("test-channel", channel.Name);
        Assert.Equal("text", channel.Type);
        Assert.Equal(guildId, channel.GuildId);
    }

    [Fact]
    public async Task GetChannels_MultipleGuilds_ReturnsOnlyGuildChannels()
    {
        var guild1Id = Guid.NewGuid();
        var guild2Id = Guid.NewGuid();
        var userId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.AddRange(
                new GuildEntity { Id = guild1Id, Name = "Guild 1", DisplayName = "Guild 1", OwnerId = userId },
                new GuildEntity { Id = guild2Id, Name = "Guild 2", DisplayName = "Guild 2", OwnerId = Guid.NewGuid() }
            );
            db.Members.AddRange(
                new Member { UserId = userId, GuildId = guild1Id, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = userId, GuildId = guild2Id, Role = MemberRole.Member, DisplayName = "Member", Username = "member" }
            );
            db.Channels.AddRange(
                new Channel { Id = Guid.NewGuid(), GuildId = guild1Id, Name = "ch1", Type = "text" },
                new Channel { Id = Guid.NewGuid(), GuildId = guild1Id, Name = "ch2", Type = "text" },
                new Channel { Id = Guid.NewGuid(), GuildId = guild2Id, Name = "ch3", Type = "voice" }
            );
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, userId);

        var response = await client.GetAsync($"/guilds/{guild1Id}/channels");

        var body = await response.Content.ReadFromJsonAsync<ChannelDto[]>();
        Assert.NotNull(body);
        Assert.Equal(2, body.Length);
        Assert.All(body, ch => Assert.Equal(guild1Id, ch.GuildId));
    }

    private record ChannelDto(Guid Id, Guid GuildId, string Name, string Type, DateTime CreatedAt);
}
