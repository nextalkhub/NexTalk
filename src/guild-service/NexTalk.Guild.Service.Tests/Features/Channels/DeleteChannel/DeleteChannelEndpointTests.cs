using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Channels.DeleteChannel;

public class DeleteChannelEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private static void Authorize(HttpClient client, string userId) =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId, "Test User", "testuser"));

    [Fact]
    public async Task DeleteChannel_WithoutToken_Returns401()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var response = await NewClient().DeleteAsync($"/guilds/{guildId}/channels/{channelId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteChannel_ChannelNotFound_Returns404()
    {
        var client = NewClient();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        Authorize(client, ownerId);

        var response = await client.DeleteAsync($"/guilds/{guildId}/channels/{channelId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteChannel_WithOwner_Returns204()
    {
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            db.Channels.Add(new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = ChannelType.Text });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        var response = await client.DeleteAsync($"/guilds/{guildId}/channels/{channelId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteChannel_WithAdmin_Returns204()
    {
        var ownerId = Guid.NewGuid().ToString();
        var adminId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId });
            db.Members.AddRange(
                new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = adminId, GuildId = guildId, Role = MemberRole.Admin, DisplayName = "Admin", Username = "admin" }
            );
            db.Channels.Add(new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = ChannelType.Text });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, adminId);

        var response = await client.DeleteAsync($"/guilds/{guildId}/channels/{channelId}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteChannel_WithMember_Returns403()
    {
        var ownerId = Guid.NewGuid().ToString();
        var memberId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId });
            db.Members.AddRange(
                new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" }
            );
            db.Channels.Add(new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = ChannelType.Text });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, memberId);

        var response = await client.DeleteAsync($"/guilds/{guildId}/channels/{channelId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteChannel_RemovesFromDatabase()
    {
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            db.Channels.Add(new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = ChannelType.Text });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        await client.DeleteAsync($"/guilds/{guildId}/channels/{channelId}");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            var channel = await db.Channels.FindAsync(channelId);
            Assert.Null(channel);
        }
    }
}
