using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;
using GuildAggregate = NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Tests.Features.Invites.CreateInvite;

public class CreateInviteEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient AuthedClient(Guid userId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId));
        return client;
    }

    private async Task<(Guid guildId, Guid ownerId)> SeedGuildAsync(MemberRole role = MemberRole.Owner)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
        var guildId = Guid.NewGuid();
        var callerId = Guid.NewGuid();

        db.Guilds.Add(new GuildAggregate
        {
            Id = guildId, Name = "g", DisplayName = "g",
            OwnerId = role == MemberRole.Owner ? callerId : Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        });
        db.Members.Add(new Member
        {
            Id = Guid.NewGuid(), GuildId = guildId, UserId = callerId,
            DisplayName = "U", Username = "u",
            Role = role, JoinedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return (guildId, callerId);
    }

    private record InviteBody(Guid Id, string Code, string Url, Guid GuildId, DateTime? ExpiresAt, int? MaxUses, int UsesCount, DateTime CreatedAt);

    [Fact]
    public async Task PostInvite_AsOwner_Returns201_WithCodeAndUrl()
    {
        var (guildId, ownerId) = await SeedGuildAsync();
        var client = AuthedClient(ownerId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresIn = "24h", maxUses = 25 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InviteBody>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body.Id);
        Assert.False(string.IsNullOrEmpty(body.Code));
        Assert.Equal($"https://test.local/invite/{body.Code}", body.Url);
        Assert.Equal(25, body.MaxUses);
        Assert.Equal(0, body.UsesCount);
        Assert.NotNull(body.ExpiresAt);
    }

    [Fact]
    public async Task PostInvite_AsAdmin_Returns201()
    {
        var (guildId, adminId) = await SeedGuildAsync(MemberRole.Admin);
        var client = AuthedClient(adminId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresIn = "1h" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task PostInvite_AsMember_Returns403()
    {
        var (guildId, memberId) = await SeedGuildAsync(MemberRole.Member);
        var client = AuthedClient(memberId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresIn = "1h" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostInvite_AsNonMember_Returns403()
    {
        var (guildId, _) = await SeedGuildAsync();
        var client = AuthedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresIn = "1h" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostInvite_WhenGuildMissing_Returns404()
    {
        var client = AuthedClient(Guid.NewGuid());

        var response = await client.PostAsJsonAsync(
            $"/guilds/{Guid.NewGuid()}/invites",
            new { expiresIn = "1h" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostInvite_AcceptsLegacyExpiresInSeconds()
    {
        var (guildId, ownerId) = await SeedGuildAsync();
        var client = AuthedClient(ownerId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresInSeconds = 3600 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InviteBody>();
        Assert.NotNull(body);
        Assert.NotNull(body.ExpiresAt);
    }

    [Fact]
    public async Task PostInvite_WithoutExpiresIn_CreatesNonExpiring()
    {
        var (guildId, ownerId) = await SeedGuildAsync();
        var client = AuthedClient(ownerId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { maxUses = 5 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InviteBody>();
        Assert.NotNull(body);
        Assert.Null(body.ExpiresAt);
        Assert.Equal(5, body.MaxUses);
    }

    [Fact]
    public async Task PostInvite_WithInvalidExpiresIn_Returns400()
    {
        var (guildId, ownerId) = await SeedGuildAsync();
        var client = AuthedClient(ownerId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresIn = "garbage" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostInvite_WithNonPositiveExpiresInSeconds_Returns400()
    {
        var (guildId, ownerId) = await SeedGuildAsync();
        var client = AuthedClient(ownerId);

        var responseNegative = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresInSeconds = -3600 });
        var responseZero = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresInSeconds = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, responseNegative.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, responseZero.StatusCode);
    }

    [Fact]
    public async Task PostInvite_PersistsRowToDb()
    {
        var (guildId, ownerId) = await SeedGuildAsync();
        var client = AuthedClient(ownerId);

        var response = await client.PostAsJsonAsync(
            $"/guilds/{guildId}/invites",
            new { expiresIn = "24h", maxUses = 10 });

        var body = await response.Content.ReadFromJsonAsync<InviteBody>();
        Assert.NotNull(body);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
        var persisted = db.Invites.SingleOrDefault(i => i.Code == body.Code);

        Assert.NotNull(persisted);
        Assert.Equal(guildId, persisted.GuildId);
        Assert.Equal(ownerId, persisted.CreatedBy);
        Assert.Equal(10, persisted.MaxUses);
        Assert.Equal(0, persisted.UsesCount);
    }
}
