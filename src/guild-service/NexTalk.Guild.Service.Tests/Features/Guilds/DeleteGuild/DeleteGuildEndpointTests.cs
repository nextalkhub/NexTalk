using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Guilds.DeleteGuild;

public class DeleteGuildEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private static void Authorize(HttpClient client, Guid userId) =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId, "Test User", "testuser"));

    [Fact]
    public async Task DeleteGuild_WithoutToken_Returns401()
    {
        var guildId = Guid.NewGuid();
        var response = await NewClient().DeleteAsync($"/guilds/{guildId}");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DeleteGuild_GuildNotFound_Returns404()
    {
        var client = NewClient();
        var ownerId = Guid.NewGuid();
        Authorize(client, ownerId);

        var response = await client.DeleteAsync($"/guilds/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteGuild_WithOwner_Returns204()
    {
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        var response = await client.DeleteAsync($"/guilds/{guildId}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task DeleteGuild_WithMember_Returns403()
    {
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId });
            db.Members.AddRange(
                new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" }
            );
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, memberId);

        var response = await client.DeleteAsync($"/guilds/{guildId}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteGuild_RemovesFromDatabase()
    {
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        await client.DeleteAsync($"/guilds/{guildId}");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            var guild = await db.Guilds.FindAsync(guildId);
            Assert.Null(guild);
        }
    }

    [Fact]
    public async Task DeleteGuild_RemovesAllMembers()
    {
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId });
            db.Members.AddRange(
                new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
                new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" }
            );
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        await client.DeleteAsync($"/guilds/{guildId}");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            var members = db.Members.Where(m => m.GuildId == guildId).ToList();
            Assert.Empty(members);
        }
    }

    [Fact]
    public async Task DeleteGuild_RemovesAllChannels()
    {
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            db.Guilds.Add(new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId });
            db.Members.Add(new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" });
            db.Channels.Add(new ChannelEntity { Id = channelId, GuildId = guildId, Name = "test", Type = "text" });
            await db.SaveChangesAsync();
        }

        var client = NewClient();
        Authorize(client, ownerId);

        await client.DeleteAsync($"/guilds/{guildId}");

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
            var channels = db.Channels.Where(c => c.GuildId == guildId).ToList();
            Assert.Empty(channels);
        }
    }
}
