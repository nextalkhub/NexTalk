using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Invites.CreateInvite;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using Xunit;
using GuildAggregate = NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Tests.Features.Invites.CreateInvite;

public class CreateInviteHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IConfiguration CreateConfig(string? baseUrl = "https://test.local/invite") =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Invites:BaseUrl"] = baseUrl })
            .Build();

    private static CreateInviteHandler CreateHandler(GuildDbContext db, IConfiguration? config = null) =>
        new(db, new RbacService(db), config ?? CreateConfig());

    private static async Task<(Guid guildId, Guid ownerId)> SeedGuildAsync(GuildDbContext db, MemberRole callerRole = MemberRole.Owner)
    {
        var guildId = Guid.NewGuid();
        var callerId = Guid.NewGuid();
        db.Guilds.Add(new GuildAggregate
        {
            Id = guildId, Name = "g", DisplayName = "g",
            OwnerId = callerRole == MemberRole.Owner ? callerId : Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow
        });
        db.Members.Add(new Member
        {
            Id = Guid.NewGuid(), GuildId = guildId, UserId = callerId,
            DisplayName = "U", Username = "u",
            Role = callerRole, JoinedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
        return (guildId, callerId);
    }

    [Fact]
    public async Task Handle_WhenGuildMissing_Throws404()
    {
        await using var db = CreateDb();
        var handler = CreateHandler(db);

        var cmd = new CreateInviteCommand(Guid.NewGuid(), TimeSpan.FromHours(24), 10, Guid.NewGuid());

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task Handle_WhenCallerIsMember_Throws403()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db, MemberRole.Member);
        var handler = CreateHandler(db);

        var cmd = new CreateInviteCommand(guildId, TimeSpan.FromHours(24), 10, callerId);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task Handle_WhenCallerNotAMember_Throws403()
    {
        await using var db = CreateDb();
        var (guildId, _) = await SeedGuildAsync(db);
        var handler = CreateHandler(db);

        var cmd = new CreateInviteCommand(guildId, TimeSpan.FromHours(24), 10, Guid.NewGuid());

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task Handle_AsOwner_PersistsInviteAndReturnsResponse()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db, MemberRole.Owner);
        var handler = CreateHandler(db);

        var cmd = new CreateInviteCommand(guildId, TimeSpan.FromHours(24), 25, callerId);
        var result = await handler.HandleAsync(cmd);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.False(string.IsNullOrEmpty(result.Code));
        Assert.Equal(guildId, result.GuildId);
        Assert.Equal(25, result.MaxUses);
        Assert.Equal(0, result.UsesCount);
        Assert.NotNull(result.ExpiresAt);
        Assert.InRange(result.ExpiresAt!.Value,
            DateTime.UtcNow.AddHours(23.99),
            DateTime.UtcNow.AddHours(24.01));

        var persisted = await db.Invites.SingleAsync(i => i.GuildId == guildId);
        Assert.Equal(result.Code, persisted.Code);
        Assert.Equal(callerId, persisted.CreatedBy);
    }

    [Fact]
    public async Task Handle_AsAdmin_Succeeds()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db, MemberRole.Admin);
        var handler = CreateHandler(db);

        var result = await handler.HandleAsync(
            new CreateInviteCommand(guildId, TimeSpan.FromHours(1), null, callerId));

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Null(result.MaxUses);
    }

    [Fact]
    public async Task Handle_WithoutExpiresIn_PersistsNullExpiry()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var handler = CreateHandler(db);

        var result = await handler.HandleAsync(
            new CreateInviteCommand(guildId, null, null, callerId));

        Assert.Null(result.ExpiresAt);
        Assert.Null(result.MaxUses);
    }

    [Fact]
    public async Task Handle_GeneratesUrlFromConfiguredBaseUrl()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var handler = CreateHandler(db, CreateConfig("https://nextalk.fun/invite"));

        var result = await handler.HandleAsync(
            new CreateInviteCommand(guildId, null, null, callerId));

        Assert.Equal($"https://nextalk.fun/invite/{result.Code}", result.Url);
    }

    [Fact]
    public async Task Handle_TrimsTrailingSlashFromBaseUrl()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var handler = CreateHandler(db, CreateConfig("https://nextalk.fun/invite/"));

        var result = await handler.HandleAsync(
            new CreateInviteCommand(guildId, null, null, callerId));

        Assert.Equal($"https://nextalk.fun/invite/{result.Code}", result.Url);
    }

    [Fact]
    public async Task Handle_UsesFallbackBaseUrl_WhenConfigMissing()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var emptyConfig = new ConfigurationBuilder().Build();
        var handler = CreateHandler(db, emptyConfig);

        var result = await handler.HandleAsync(
            new CreateInviteCommand(guildId, null, null, callerId));

        Assert.StartsWith("https://nextalk.fun/invite/", result.Url);
    }

    [Fact]
    public async Task Handle_GeneratesDifferentCodesAcrossInvocations()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var handler = CreateHandler(db);

        var codes = new HashSet<string>();
        for (var i = 0; i < 20; i++)
        {
            var r = await handler.HandleAsync(
                new CreateInviteCommand(guildId, null, null, callerId));
            codes.Add(r.Code);
        }

        Assert.Equal(20, codes.Count);
    }

    [Fact]
    public async Task Handle_WithNonPositiveMaxUses_ThrowsBadRequest()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var handler = CreateHandler(db);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new CreateInviteCommand(guildId, null, 0, callerId)));
        await Assert.ThrowsAsync<BadRequestException>(() =>
            handler.HandleAsync(new CreateInviteCommand(guildId, null, -1, callerId)));
    }

    [Fact]
    public async Task Handle_CodeIsUrlSafeBase64()
    {
        await using var db = CreateDb();
        var (guildId, callerId) = await SeedGuildAsync(db);
        var handler = CreateHandler(db);

        var result = await handler.HandleAsync(
            new CreateInviteCommand(guildId, null, null, callerId));

        // base64url alphabet: A-Z a-z 0-9 - _
        Assert.Matches("^[A-Za-z0-9_-]+$", result.Code);
        // 9 bytes → 12 chars (no padding)
        Assert.Equal(12, result.Code.Length);
    }
}
