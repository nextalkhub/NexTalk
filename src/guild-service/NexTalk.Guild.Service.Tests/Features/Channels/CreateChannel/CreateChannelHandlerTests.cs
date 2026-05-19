using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Channels.CreateChannel;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Channels.CreateChannel;

public class CreateChannelHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task HandleAsync_GuildNotFound_ThrowsNotFoundException()
    {
        await using var db = CreateDb();
        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(Guid.NewGuid(), "test", ChannelType.Text, Guid.NewGuid().ToString());

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task HandleAsync_OwnerCreatesChannel_Succeeds()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(guildId, "announcements", ChannelType.Text, ownerId);
        var result = await handler.HandleAsync(cmd);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("announcements", result.Name);
        Assert.Equal("text", result.Type);
        Assert.Equal(guildId, result.GuildId);
    }

    [Fact]
    public async Task HandleAsync_AdminCreatesChannel_Succeeds()
    {
        await using var db = CreateDb();
        var adminId = Guid.NewGuid().ToString();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var ownerMember = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var adminMember = new Member { UserId = adminId, GuildId = guildId, Role = MemberRole.Admin, DisplayName = "Admin", Username = "admin" };
        db.Guilds.Add(guild);
        db.Members.AddRange(ownerMember, adminMember);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(guildId, "rules", ChannelType.Text, adminId);
        var result = await handler.HandleAsync(cmd);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("rules", result.Name);
    }

    [Fact]
    public async Task HandleAsync_MemberCreatesChannel_ThrowsForbidden()
    {
        await using var db = CreateDb();
        var memberId = Guid.NewGuid().ToString();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var ownerMember = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var regularMember = new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" };
        db.Guilds.Add(guild);
        db.Members.AddRange(ownerMember, regularMember);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(guildId, "test", ChannelType.Text, memberId);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task HandleAsync_CreatesTextChannel()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(guildId, "chat", ChannelType.Text, ownerId);
        await handler.HandleAsync(cmd);

        var channel = await db.Channels.SingleAsync(c => c.Name == "chat");
        Assert.Equal(ChannelType.Text, channel.Type);
    }

    [Fact]
    public async Task HandleAsync_CreatesVoiceChannel()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(guildId, "voice-room", ChannelType.Voice, ownerId);
        await handler.HandleAsync(cmd);

        var channel = await db.Channels.SingleAsync(c => c.Name == "voice-room");
        Assert.Equal(ChannelType.Voice, channel.Type);
    }

    [Fact]
    public async Task HandleAsync_BroadcastFails_ContinuesSuccessfully()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient { ShouldFail = true };
        var handler = new CreateChannelHandler(db, rbac, wsGateway);

        var cmd = new CreateChannelCommand(guildId, "test", ChannelType.Text, ownerId);
        var result = await handler.HandleAsync(cmd);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.True(await db.Channels.AnyAsync(c => c.Id == result.Id));
    }
}

internal class TestWsGatewayClient : WsGatewayClient
{
    public bool ShouldFail { get; set; }

    public TestWsGatewayClient() : base(new HttpClient()) { }

    public override async Task BroadcastToGuildAsync(Guid guildId, string eventType, object payload, CancellationToken ct = default)
    {
        if (ShouldFail)
            throw new Exception("Broadcast failed");
        await Task.CompletedTask;
    }
}
