using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Members.AssignRole;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;
using GuildDomain = NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Tests.Features.Members.AssignRole;

public class AssignRoleEndpointTests : IAsyncLifetime
{
    private readonly GuildServiceFactory _factory = new();
    private GuildDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _db = await _factory.GetDbContextAsync();
        // InMemory database doesn't require EnsureCreated, it's created automatically
        // await _db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        _factory.Dispose();
    }

    private async Task<(GuildDomain guild, Member owner, Member target)> SetupGuildWithMembersAsync()
    {
        var guild = new GuildDomain
        {
            Id = Guid.NewGuid(),
            Name = "test-guild",
            DisplayName = "Test Guild",
            OwnerId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        };

        var owner = new Member
        {
            Id = Guid.NewGuid(),
            GuildId = guild.Id,
            UserId = guild.OwnerId,
            DisplayName = "Guild Owner",
            Username = "owner",
            Role = MemberRole.Owner,
            JoinedAt = DateTime.UtcNow
        };

        var target = new Member
        {
            Id = Guid.NewGuid(),
            GuildId = guild.Id,
            UserId = Guid.NewGuid(),
            DisplayName = "Target User",
            Username = "target",
            Role = MemberRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        _db.Guilds.Add(guild);
        _db.Members.AddRange(owner, target);
        await _db.SaveChangesAsync();

        // Detach from context so changes are committed to InMemory store
        _db.ChangeTracker.Clear();

        return (guild, owner, target);
    }

    [Fact]
    public async Task Put_AssignRole_WithValidOwner_Returns200WithResponse()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);

        var request = new AssignRoleEndpoint.Request("Admin");
        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = JsonSerializer.Deserialize<AssignRoleEndpoint.Response>(json, options);
        Assert.NotNull(result);
        Assert.Equal(target.UserId, result.UserId);
        Assert.Equal("Admin", result.Role);
    }

    [Fact]
    public async Task Put_AssignRole_AssignsRoleToDatabase()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);

        var request = new AssignRoleEndpoint.Request("Admin");
        await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        var updated = await _db.Members.FirstAsync(m => m.UserId == target.UserId && m.GuildId == guild.Id);
        Assert.Equal(MemberRole.Admin, updated.Role);
    }

    [Fact]
    public async Task Put_AssignRole_WithNonOwner_Returns403Forbidden()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();

        var nonOwner = new Member
        {
            Id = Guid.NewGuid(),
            GuildId = guild.Id,
            UserId = Guid.NewGuid(),
            DisplayName = "Non Owner",
            Username = "nonowner",
            Role = MemberRole.Admin,
            JoinedAt = DateTime.UtcNow
        };

        _db.Members.Add(nonOwner);
        await _db.SaveChangesAsync();

        var client = _factory.CreateAuthenticatedClient(nonOwner.UserId);
        var request = new AssignRoleEndpoint.Request("Admin");

        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Put_AssignRole_WithNonExistentTarget_Returns404NotFound()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);
        var nonExistentUserId = Guid.NewGuid();

        var request = new AssignRoleEndpoint.Request("Admin");
        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{nonExistentUserId}/role",
            request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Put_AssignRole_WithOwnerRole_Returns400BadRequest()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);

        var request = new AssignRoleEndpoint.Request("Owner");
        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Put_AssignRole_WithInvalidRole_Returns400BadRequest()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);

        var request = new AssignRoleEndpoint.Request("InvalidRole");
        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("member")]
    [InlineData("Member")]
    [InlineData("MEMBER")]
    public async Task Put_AssignRole_WithCasedRoleNames_WorksCorrectly(string roleStr)
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);

        var request = new AssignRoleEndpoint.Request(roleStr);
        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await _db.Members.FirstAsync(m => m.UserId == target.UserId && m.GuildId == guild.Id);
        Assert.Equal(MemberRole.Member, updated.Role);
    }

    [Fact]
    public async Task Put_AssignRole_WithoutBearerToken_Returns401Unauthorized()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateClient();

        var request = new AssignRoleEndpoint.Request("Admin");
        var response = await client.PutAsJsonAsync(
            $"/guilds/{guild.Id}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Put_AssignRole_WithNonExistentGuild_Returns403Forbidden()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var client = _factory.CreateAuthenticatedClient(owner.UserId);
        var nonExistentGuildId = Guid.NewGuid();

        var request = new AssignRoleEndpoint.Request("Admin");
        var response = await client.PutAsJsonAsync(
            $"/guilds/{nonExistentGuildId}/members/{target.UserId}/role",
            request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
