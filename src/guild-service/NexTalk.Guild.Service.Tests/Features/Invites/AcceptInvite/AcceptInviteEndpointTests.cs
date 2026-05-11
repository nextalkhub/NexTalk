using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Invites.AcceptInvite;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Xunit;
using GuildAggregate = NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Tests.Features.Invites.AcceptInvite;

public class AcceptInviteEndpointTests(GuildServiceFactory factory) : IClassFixture<GuildServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private HttpClient NewClient(bool claimSucceeds) =>
        factory.WithWebHostBuilder(b =>
            b.ConfigureTestServices(s =>
            {
                var existing = s.Where(d => d.ServiceType == typeof(IInviteRepository)).ToList();
                foreach (var d in existing) s.Remove(d);
                s.AddScoped<IInviteRepository>(_ => new FakeInviteRepository(claimSucceeds));
            }))
        .CreateClient();

    private static void Authorize(HttpClient client, Guid userId, string name = "Test", string username = "test") =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId, name, username));

    private async Task<string> SeedInviteAsync(string code, Guid? userId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();

        var ownerId = userId ?? Guid.NewGuid();
        var guildId = Guid.NewGuid();

        db.Guilds.Add(new GuildAggregate
        {
            Id = guildId, Name = "Invite Test Guild", DisplayName = "Invite Test Guild",
            OwnerId = ownerId, CreatedAt = DateTime.UtcNow
        });
        db.Invites.Add(new Invite
        {
            Id = Guid.NewGuid(), GuildId = guildId, Code = code,
            CreatedBy = ownerId, CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return code;
    }

    [Fact]
    public async Task PostAcceptInvite_WithoutToken_Returns401()
    {
        var response = await NewClient().PostAsync("/invites/ANYCODE/accept", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostAcceptInvite_WithNonExistentCode_Returns404()
    {
        var client = NewClient();
        Authorize(client, Guid.NewGuid());

        var response = await client.PostAsync("/invites/NOEXIST/accept", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostAcceptInvite_WhenBanned_Returns403()
    {
        var userId = Guid.NewGuid();
        var code = $"BAN{Guid.NewGuid():N}"[..10];
        await SeedInviteAsync(code);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
        var guildId = db.Invites.Single(i => i.Code == code).GuildId;
        db.Bans.Add(new Ban { Id = Guid.NewGuid(), GuildId = guildId, UserId = userId, BannedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var client = NewClient();
        Authorize(client, userId);

        var response = await client.PostAsync($"/invites/{code}/accept", null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostAcceptInvite_WhenAlreadyMember_Returns400()
    {
        var userId = Guid.NewGuid();
        var code = $"MEM{Guid.NewGuid():N}"[..10];
        await SeedInviteAsync(code);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
        var guildId = db.Invites.Single(i => i.Code == code).GuildId;
        db.Members.Add(new Member
        {
            Id = Guid.NewGuid(), GuildId = guildId, UserId = userId,
            DisplayName = "X", Username = "x", Role = MemberRole.Member, JoinedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var client = NewClient();
        Authorize(client, userId);

        var response = await client.PostAsync($"/invites/{code}/accept", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostAcceptInvite_WhenClaimFails_Returns400()
    {
        var code = $"EXP{Guid.NewGuid():N}"[..10];
        await SeedInviteAsync(code);

        var client = NewClient(claimSucceeds: false);
        Authorize(client, Guid.NewGuid());

        var response = await client.PostAsync($"/invites/{code}/accept", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostAcceptInvite_WithValidInvite_Returns200WithGuild()
    {
        var code = $"OK{Guid.NewGuid():N}"[..10];
        await SeedInviteAsync(code);

        var client = NewClient();
        Authorize(client, Guid.NewGuid(), "Charlie", "charlie");

        var response = await client.PostAsync($"/invites/{code}/accept", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<GuildResponse>();
        Assert.NotNull(body);
        Assert.Equal("Invite Test Guild", body.Name);
    }

    [Fact]
    public async Task PostAcceptInvite_WithValidInvite_CreatesMember()
    {
        var userId = Guid.NewGuid();
        var code = $"MB{Guid.NewGuid():N}"[..10];
        await SeedInviteAsync(code);

        var client = NewClient();
        Authorize(client, userId, "Dana", "dana");

        await client.PostAsync($"/invites/{code}/accept", null);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GuildDbContext>();
        var guildId = db.Invites.Single(i => i.Code == code).GuildId;

        Assert.True(db.Members.Any(m =>
            m.GuildId == guildId &&
            m.UserId == userId &&
            m.Role == MemberRole.Member));
    }

    private record GuildResponse(Guid Id, string Name, string DisplayName, Guid OwnerId, DateTime CreatedAt);
}
