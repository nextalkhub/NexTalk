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

namespace NexTalk.Guild.Service.Tests.Features.Channels.CreateChannel;

public class CreateChannelEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private static void Authorize(HttpClient client, string userId) =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId, "Test User", "testuser"));

    [Fact]
    public async Task PostChannels_WithoutToken_Returns401()
    {
        var guildId = Guid.NewGuid();
        var response = await NewClient().PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "test", type = "text" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostChannels_GuildNotFound_Returns404()
    {
        var client = NewClient();
        var guildId = Guid.NewGuid();
        var userId = Guid.NewGuid().ToString();
        Authorize(client, userId);

        var response = await client.PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "test", type = "text" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostChannels_WithOwner_Returns201()
    {
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        var response = await client.PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "announcements", type = "text" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task PostChannels_WithAdmin_Returns201()
    {
        var ownerId = Guid.NewGuid().ToString();
        var adminId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", OwnerId = ownerId });
            db.Members.AddRange(
                new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = adminId, GuildId = guildId, Role = MemberRole.Admin, DisplayName = "Admin", Username = "admin" }
            );
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, adminId);

        var response = await client.PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "rules", type = "text" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task PostChannels_WithMember_Returns403()
    {
        var ownerId = Guid.NewGuid().ToString();
        var memberId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", OwnerId = ownerId });
            db.Members.AddRange(
                new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" }
            );
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, memberId);

        var response = await client.PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "test", type = "text" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostChannels_ReturnsChannelResponse()
    {
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        var response = await client.PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "general", type = "text" });

        var body = await response.Content.ReadFromJsonAsync<ChannelCreatedResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body.Id);
        Assert.Equal("general", body.Name);
        Assert.Equal("text", body.Type);
        Assert.Equal(guildId, body.GuildId);
    }

    [Fact]
    public async Task PostChannels_PersistsChannel()
    {
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test Guild", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        var response = await client.PostAsJsonAsync($"/guilds/{guildId}/channels",
            new { name = "music", type = "voice" });

        var body = await response.Content.ReadFromJsonAsync<ChannelCreatedResponse>();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            var channel = await db.Channels.FindAsync(body.Id);
            Assert.NotNull(channel);
            Assert.Equal("music", channel.Name);
            Assert.Equal(ChannelType.Voice, channel.Type);
            Assert.Equal(guildId, channel.GuildId);
        }
    }

    private record ChannelCreatedResponse(Guid Id, Guid GuildId, string Name, string Type, DateTimeOffset CreatedAt);
}
