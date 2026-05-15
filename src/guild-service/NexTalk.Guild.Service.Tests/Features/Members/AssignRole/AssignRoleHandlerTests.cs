using Microsoft.EntityFrameworkCore;
using Moq;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Members.AssignRole;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using Xunit;
using System.Net.Http;
using GuildDomain = NexTalk.Guild.Service.Domain.Guild;

namespace NexTalk.Guild.Service.Tests.Features.Members.AssignRole;

public class AssignRoleHandlerTests
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly Mock<WsGatewayClient> _wsGatewayMock;
    private readonly AssignRoleHandler _handler;

    public AssignRoleHandlerTests()
    {
        var options = new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new GuildDbContext(options);
        _rbac = new RbacService(_db);
        var httpClient = new HttpClient(new MockHttpMessageHandler());
        _wsGatewayMock = new Mock<WsGatewayClient>(httpClient);
        _handler = new AssignRoleHandler(_db, _rbac, _wsGatewayMock.Object);
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

        return (guild, owner, target);
    }

    [Fact]
    public async Task HandleAsync_WithValidOwnerAndTarget_AssignsRoleSuccessfully()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();

        var cmd = new AssignRoleCommand(guild.Id, target.UserId, MemberRole.Admin, owner.UserId);
        await _handler.HandleAsync(cmd);

        var updated = await _db.Members.FirstAsync(m => m.UserId == target.UserId && m.GuildId == guild.Id);
        Assert.Equal(MemberRole.Admin, updated.Role);
    }

    [Fact]
    public async Task HandleAsync_WithValidOwner_BroadcastsToGuild()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();

        var cmd = new AssignRoleCommand(guild.Id, target.UserId, MemberRole.Admin, owner.UserId);
        await _handler.HandleAsync(cmd);

        _wsGatewayMock.Verify(
            x => x.BroadcastToGuildAsync(
                guild.Id,
                "role-assigned",
                It.IsAny<object>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithNonOwnerCaller_ThrowsForbiddenException()
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

        var cmd = new AssignRoleCommand(guild.Id, target.UserId, MemberRole.Admin, nonOwner.UserId);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _handler.HandleAsync(cmd));
        Assert.Equal("Owner role required.", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WithNonExistentTarget_ThrowsNotFoundException()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();
        var nonExistentUserId = Guid.NewGuid();

        var cmd = new AssignRoleCommand(guild.Id, nonExistentUserId, MemberRole.Admin, owner.UserId);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _handler.HandleAsync(cmd));
        Assert.Equal("Member not found in guild.", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WhenAssigningOwnerRole_ThrowsBadRequestException()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();

        var cmd = new AssignRoleCommand(guild.Id, target.UserId, MemberRole.Owner, owner.UserId);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _handler.HandleAsync(cmd));
        Assert.Equal("Cannot assign Owner role via this endpoint.", ex.Message);
    }

    [Theory]
    [InlineData(MemberRole.Member)]
    [InlineData(MemberRole.Admin)]
    public async Task HandleAsync_AssignsVariousRoles_Successfully(MemberRole roleToAssign)
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();

        var cmd = new AssignRoleCommand(guild.Id, target.UserId, roleToAssign, owner.UserId);
        await _handler.HandleAsync(cmd);

        var updated = await _db.Members.FirstAsync(m => m.UserId == target.UserId && m.GuildId == guild.Id);
        Assert.Equal(roleToAssign, updated.Role);
    }

    [Fact]
    public async Task HandleAsync_WhenBroadcastFails_ContinuesSuccessfully()
    {
        var (guild, owner, target) = await SetupGuildWithMembersAsync();

        // Broadcast is already set to return 200 OK by default MockHttpMessageHandler,
        // so we need to configure it to throw
        _wsGatewayMock
            .Setup(x => x.BroadcastToGuildAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Gateway unavailable"));

        var cmd = new AssignRoleCommand(guild.Id, target.UserId, MemberRole.Admin, owner.UserId);

        // Should not throw even though broadcast fails (best-effort)
        await _handler.HandleAsync(cmd);

        var updated = await _db.Members.FirstAsync(m => m.UserId == target.UserId && m.GuildId == guild.Id);
        Assert.Equal(MemberRole.Admin, updated.Role);
    }
}

public class MockHttpMessageHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.OK });
    }
}
