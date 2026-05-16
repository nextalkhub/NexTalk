using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Channels.DeleteChannel;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Channels.DeleteChannel;

public class DeleteChannelHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task HandleAsync_ChannelNotFound_ThrowsNotFoundException()
    {
        await using var db = CreateDb();
        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task HandleAsync_OwnerDeletesChannel_Succeeds()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var channel = new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = "text" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(guildId, channelId, ownerId);
        await handler.HandleAsync(cmd);

        var deleted = await db.Channels.FindAsync(channelId);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task HandleAsync_AdminDeletesChannel_Succeeds()
    {
        await using var db = CreateDb();
        var adminId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId };
        var ownerMember = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var adminMember = new Member { UserId = adminId, GuildId = guildId, Role = MemberRole.Admin, DisplayName = "Admin", Username = "admin" };
        var channel = new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = "text" };
        db.Guilds.Add(guild);
        db.Members.AddRange(ownerMember, adminMember);
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(guildId, channelId, adminId);
        await handler.HandleAsync(cmd);

        var deleted = await db.Channels.FindAsync(channelId);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task HandleAsync_MemberDeletesChannel_ThrowsForbidden()
    {
        await using var db = CreateDb();
        var memberId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId };
        var ownerMember = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var regularMember = new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" };
        var channel = new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = "text" };
        db.Guilds.Add(guild);
        db.Members.AddRange(ownerMember, regularMember);
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(guildId, channelId, memberId);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task HandleAsync_DeleteVoiceChannel_DisconnectsUsers()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var channel = new Channel { Id = channelId, GuildId = guildId, Name = "voice", Type = "voice" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(guildId, channelId, ownerId);
        await handler.HandleAsync(cmd);

        Assert.True(voiceService.DisconnectCalled);
        Assert.Equal(channelId, voiceService.DisconnectedChannelId);
    }

    [Fact]
    public async Task HandleAsync_DeleteTextChannel_DoesNotDisconnect()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var channel = new Channel { Id = channelId, GuildId = guildId, Name = "text", Type = "text" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient();
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(guildId, channelId, ownerId);
        await handler.HandleAsync(cmd);

        Assert.False(voiceService.DisconnectCalled);
    }

    [Fact]
    public async Task HandleAsync_BroadcastFails_ContinuesSuccessfully()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", DisplayName = "Test Guild", OwnerId = ownerId };
        var member = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var channel = new Channel { Id = channelId, GuildId = guildId, Name = "test", Type = "text" };
        db.Guilds.Add(guild);
        db.Members.Add(member);
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        var rbac = new RbacService(db);
        var wsGateway = new TestWsGatewayClient { ShouldFail = true };
        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteChannelHandler(db, rbac, wsGateway, voiceService);

        var cmd = new DeleteChannelCommand(guildId, channelId, ownerId);
        await handler.HandleAsync(cmd);

        var deleted = await db.Channels.FindAsync(channelId);
        Assert.Null(deleted);
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

internal class TestVoiceServiceClient : VoiceServiceClient
{
    public bool DisconnectCalled { get; set; }
    public Guid DisconnectedChannelId { get; set; }

    public TestVoiceServiceClient() : base(new HttpClient()) { }

    public override async Task DisconnectAllFromChannelAsync(Guid channelId, CancellationToken ct = default)
    {
        DisconnectCalled = true;
        DisconnectedChannelId = channelId;
        await Task.CompletedTask;
    }
}
