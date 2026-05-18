using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Guilds.DeleteGuild;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using Xunit;
using GuildEntity = NexTalk.Guild.Service.Domain.Guild;
using ChannelEntity = NexTalk.Guild.Service.Domain.Channel;

namespace NexTalk.Guild.Service.Tests.Features.Guilds.DeleteGuild;

public class DeleteGuildHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task HandleAsync_GuildNotFound_ThrowsNotFoundException()
    {
        await using var db = CreateDb();
        var handler = new DeleteGuildHandler(db, new RbacService(db), new TestWsGatewayClient(), new TestVoiceServiceClient());

        var cmd = new DeleteGuildCommand(Guid.NewGuid(), Guid.NewGuid().ToString());

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task HandleAsync_NonOwnerDeletesGuild_ThrowsForbidden()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var memberId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var ownerMember = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var regularMember = new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" };
        db.Guilds.Add(guild);
        db.Members.AddRange(ownerMember, regularMember);
        await db.SaveChangesAsync();

        var handler = new DeleteGuildHandler(db, new RbacService(db), new TestWsGatewayClient(), new TestVoiceServiceClient());
        var cmd = new DeleteGuildCommand(guildId, memberId);

        await Assert.ThrowsAsync<ForbiddenException>(() => handler.HandleAsync(cmd));
    }

    [Fact]
    public async Task HandleAsync_OwnerDeletesGuild_Succeeds()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var owner = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(owner);
        await db.SaveChangesAsync();

        var handler = new DeleteGuildHandler(db, new RbacService(db), new TestWsGatewayClient(), new TestVoiceServiceClient());
        var cmd = new DeleteGuildCommand(guildId, ownerId);

        await handler.HandleAsync(cmd);

        var deleted = await db.Guilds.FindAsync(guildId);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task HandleAsync_DeletesAllMembers()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var memberId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        db.Guilds.Add(guild);
        db.Members.AddRange(
            new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" },
            new Member { UserId = memberId, GuildId = guildId, Role = MemberRole.Member, DisplayName = "User", Username = "user" }
        );
        await db.SaveChangesAsync();

        var handler = new DeleteGuildHandler(db, new RbacService(db), new TestWsGatewayClient(), new TestVoiceServiceClient());
        var cmd = new DeleteGuildCommand(guildId, ownerId);

        await handler.HandleAsync(cmd);

        var members = await db.Members.Where(m => m.GuildId == guildId).ToListAsync();
        Assert.Empty(members);
    }

    [Fact]
    public async Task HandleAsync_DeletesAllChannels()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var owner = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(owner);
        db.Channels.AddRange(
            new ChannelEntity { Id = Guid.NewGuid(), GuildId = guildId, Name = "general", Type = ChannelType.Text },
            new ChannelEntity { Id = Guid.NewGuid(), GuildId = guildId, Name = "voice", Type = ChannelType.Voice }
        );
        await db.SaveChangesAsync();

        var handler = new DeleteGuildHandler(db, new RbacService(db), new TestWsGatewayClient(), new TestVoiceServiceClient());
        var cmd = new DeleteGuildCommand(guildId, ownerId);

        await handler.HandleAsync(cmd);

        var channels = await db.Channels.Where(c => c.GuildId == guildId).ToListAsync();
        Assert.Empty(channels);
    }

    [Fact]
    public async Task HandleAsync_DisconnectsFromVoiceChannels()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();
        var voiceChannelId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var owner = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        var voiceChannel = new ChannelEntity { Id = voiceChannelId, GuildId = guildId, Name = "voice", Type = ChannelType.Voice };
        db.Guilds.Add(guild);
        db.Members.Add(owner);
        db.Channels.Add(voiceChannel);
        await db.SaveChangesAsync();

        var voiceService = new TestVoiceServiceClient();
        var handler = new DeleteGuildHandler(db, new RbacService(db), new TestWsGatewayClient(), voiceService);
        var cmd = new DeleteGuildCommand(guildId, ownerId);

        await handler.HandleAsync(cmd);

        Assert.True(voiceService.DisconnectChannelIds.Contains(voiceChannelId));
    }

    [Fact]
    public async Task HandleAsync_BroadcastFails_ContinuesSuccessfully()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid().ToString();
        var guildId = Guid.NewGuid();

        var guild = new GuildEntity { Id = guildId, Name = "Test", OwnerId = ownerId };
        var owner = new Member { UserId = ownerId, GuildId = guildId, Role = MemberRole.Owner, DisplayName = "Owner", Username = "owner" };
        db.Guilds.Add(guild);
        db.Members.Add(owner);
        await db.SaveChangesAsync();

        var wsGateway = new TestWsGatewayClient { ShouldFail = true };
        var handler = new DeleteGuildHandler(db, new RbacService(db), wsGateway, new TestVoiceServiceClient());
        var cmd = new DeleteGuildCommand(guildId, ownerId);

        await handler.HandleAsync(cmd);

        var deleted = await db.Guilds.FindAsync(guildId);
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

    public override async Task DisconnectUserFromGuildAsync(Guid guildId, string userId, CancellationToken ct = default)
    {
        await Task.CompletedTask;
    }
}

internal class TestVoiceServiceClient : VoiceServiceClient
{
    public List<Guid> DisconnectChannelIds { get; } = [];

    public TestVoiceServiceClient() : base(new HttpClient()) { }

    public override async Task DisconnectAllFromChannelAsync(Guid channelId, CancellationToken ct = default)
    {
        DisconnectChannelIds.Add(channelId);
        await Task.CompletedTask;
    }
}
