using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Invites.AcceptInvite;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Tests.Infrastructure;
using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;
using GuildAggregate = NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Tests.Features.Invites.AcceptInvite;

public class AcceptInviteHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static WsGatewayClient SilentWsGateway()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK);
        return new WsGatewayClient(new HttpClient(handler) { BaseAddress = new Uri("http://test") });
    }

    private static AcceptInviteHandler CreateHandler(
        GuildDbContext db,
        IInviteRepository? inviteRepo = null) =>
        new(db, SilentWsGateway(), inviteRepo ?? new FakeInviteRepository(claimSucceeds: true), NullLogger<AcceptInviteHandler>.Instance);

    private static async Task<(GuildDbContext db, Guid guildId, Guid inviteId)> SeedAsync(
        string code = "INVITE01",
        string? ownerId = null)
    {
        var db = CreateDb();
        var owner = ownerId ?? Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var inviteId = Guid.NewGuid();

        db.Guilds.Add(new GuildAggregate
        {
            Id = guildId, Name = "Test Guild",
            OwnerId = owner, CreatedAt = DateTimeOffset.UtcNow
        });
        db.Invites.Add(new Invite
        {
            Id = inviteId, GuildId = guildId, Code = code,
            CreatedBy = owner, CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
        return (db, guildId, inviteId);
    }

    [Fact]
    public async Task Handle_WithValidInvite_ReturnsGuild()
    {
        var (db, guildId, _) = await SeedAsync();
        var cmd = new AcceptInviteCommand("INVITE01", Guid.NewGuid().ToString(), "Alice", "alice");

        var result = await CreateHandler(db).HandleAsync(cmd);

        Assert.Equal(guildId, result.Id);
        Assert.Equal("Test Guild", result.Name);
    }

    [Fact]
    public async Task Handle_WithValidInvite_CreatesMemberWithRoleMember()
    {
        var (db, guildId, _) = await SeedAsync();
        var userId = Guid.NewGuid().ToString();
        var cmd = new AcceptInviteCommand("INVITE01", userId, "Bob", "bob");

        await CreateHandler(db).HandleAsync(cmd);

        var member = await db.Members.SingleAsync(m => m.GuildId == guildId);
        Assert.Equal(userId, member.UserId);
        Assert.Equal(MemberRole.Member, member.Role);
        Assert.Equal("Bob", member.DisplayName);
        Assert.Equal("bob", member.Username);
    }

    [Fact]
    public async Task Handle_WithNonExistentCode_ThrowsNotFound()
    {
        var (db, _, _) = await SeedAsync();
        var cmd = new AcceptInviteCommand("WRONG", Guid.NewGuid().ToString(), "X", "x");

        await Assert.ThrowsAsync<NexTalk.Guild.Service.Shared.Exceptions.NotFoundException>(
            () => CreateHandler(db).HandleAsync(cmd));
    }

    [Fact]
    public async Task Handle_WhenUserIsBanned_ThrowsForbidden()
    {
        var (db, guildId, _) = await SeedAsync();
        var userId = Guid.NewGuid().ToString();
        db.Bans.Add(new Ban { GuildId = guildId, UserId = userId, BannedBy = "system", BannedAt = DateTimeOffset.UtcNow });
        await db.SaveChangesAsync();

        var cmd = new AcceptInviteCommand("INVITE01", userId, "X", "x");

        await Assert.ThrowsAsync<NexTalk.Guild.Service.Shared.Exceptions.ForbiddenException>(
            () => CreateHandler(db).HandleAsync(cmd));
    }

    [Fact]
    public async Task Handle_WhenAlreadyMember_ThrowsBadRequest()
    {
        var (db, guildId, _) = await SeedAsync();
        var userId = Guid.NewGuid().ToString();
        db.Members.Add(new Member
        {
            GuildId = guildId, UserId = userId,
            DisplayName = "X", Username = "x", Role = MemberRole.Member, JoinedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();

        var cmd = new AcceptInviteCommand("INVITE01", userId, "X", "x");

        await Assert.ThrowsAsync<NexTalk.Guild.Service.Shared.Exceptions.BadRequestException>(
            () => CreateHandler(db).HandleAsync(cmd));
    }

    [Fact]
    public async Task Handle_WhenClaimFails_ThrowsBadRequest()
    {
        var (db, _, _) = await SeedAsync();
        var cmd = new AcceptInviteCommand("INVITE01", Guid.NewGuid().ToString(), "X", "x");

        await Assert.ThrowsAsync<NexTalk.Guild.Service.Shared.Exceptions.BadRequestException>(
            () => CreateHandler(db, new FakeInviteRepository(claimSucceeds: false)).HandleAsync(cmd));
    }

    private sealed class FakeHttpMessageHandler(HttpStatusCode status) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(status));
    }
}
