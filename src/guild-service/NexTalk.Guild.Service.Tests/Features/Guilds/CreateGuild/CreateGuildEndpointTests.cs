using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Guild.Service.Tests.Features.Guilds.CreateGuild;

public class CreateGuildEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private static void Authorize(HttpClient client, Guid userId, string name = "Test User", string username = "testuser") =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId, name, username));

    [Fact]
    public async Task PostGuilds_WithoutToken_Returns401()
    {
        var response = await NewClient().PostAsJsonAsync("/guilds",
            new { name = "Test", displayName = "Test" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostGuilds_WithInvalidToken_Returns401()
    {
        var client = NewClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "invalid.token.value");

        var response = await client.PostAsJsonAsync("/guilds",
            new { name = "Test", displayName = "Test" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostGuilds_WithValidToken_Returns201()
    {
        var client = NewClient();
        Authorize(client, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/guilds",
            new { name = "My Guild", displayName = "My Guild" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task PostGuilds_WithValidToken_ReturnsGuildId()
    {
        var client = NewClient();
        Authorize(client, Guid.NewGuid());

        var response = await client.PostAsJsonAsync("/guilds",
            new { name = "My Guild", displayName = "My Guild" });

        var body = await response.Content.ReadFromJsonAsync<GuildCreatedResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body.Id);
    }

    [Fact]
    public async Task PostGuilds_WithValidToken_PersistsGuildMemberAndChannel()
    {
        var userId = Guid.NewGuid();
        var client = NewClient();
        Authorize(client, userId, "John Doe", "johndoe");

        var response = await client.PostAsJsonAsync("/guilds",
            new { name = "Server Alpha", displayName = "Server Alpha" });

        var body = await response.Content.ReadFromJsonAsync<GuildCreatedResponse>();
        Assert.NotNull(body);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();

        var guild = await db.Guilds.FindAsync(body.Id);
        Assert.NotNull(guild);
        Assert.Equal("Server Alpha", guild.Name);
        Assert.Equal(userId, guild.OwnerId);

        Assert.True(db.Members.Any(m =>
            m.GuildId == body.Id &&
            m.UserId == userId &&
            m.Role == MemberRole.Owner &&
            m.DisplayName == "John Doe" &&
            m.Username == "johndoe"));

        Assert.True(db.Channels.Any(c =>
            c.GuildId == body.Id &&
            c.Name == "general" &&
            c.Type == "text"));
    }

    private record GuildCreatedResponse(Guid Id);
}
