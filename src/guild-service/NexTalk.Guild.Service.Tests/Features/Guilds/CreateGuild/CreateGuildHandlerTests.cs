using Microsoft.EntityFrameworkCore;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Features.Guilds.CreateGuild;
using NexTalk.Guild.Service.Infrastructure;
using Xunit;

namespace NexTalk.Guild.Service.Tests.Features.Guilds.CreateGuild;

public class CreateGuildHandlerTests
{
    private static GuildDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<GuildDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Handle_CreatesGuild_WithCorrectData()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var cmd = new CreateGuildCommand("My Server", "My Server", ownerId, "John", "john");

        var guildId = await new CreateGuildHandler(db).HandleAsync(cmd);

        var guild = await db.Guilds.FindAsync(guildId);
        Assert.NotNull(guild);
        Assert.Equal("My Server", guild.Name);
        Assert.Equal(ownerId, guild.OwnerId);
    }

    [Fact]
    public async Task Handle_CreatesOwnerMember()
    {
        await using var db = CreateDb();
        var ownerId = Guid.NewGuid();
        var cmd = new CreateGuildCommand("Test", "Test", ownerId, "Alice", "alice");

        var guildId = await new CreateGuildHandler(db).HandleAsync(cmd);

        var member = await db.Members.SingleAsync(m => m.GuildId == guildId);
        Assert.Equal(ownerId, member.UserId);
        Assert.Equal(MemberRole.Owner, member.Role);
        Assert.Equal("Alice", member.DisplayName);
        Assert.Equal("alice", member.Username);
    }

    [Fact]
    public async Task Handle_CreatesGeneralTextChannel()
    {
        await using var db = CreateDb();
        var cmd = new CreateGuildCommand("Test", "Test", Guid.NewGuid(), "User", "user");

        var guildId = await new CreateGuildHandler(db).HandleAsync(cmd);

        var channel = await db.Channels.SingleAsync(c => c.GuildId == guildId);
        Assert.Equal("general", channel.Name);
        Assert.Equal("text", channel.Type);
    }

    [Fact]
    public async Task Handle_CreatesGuildMemberAndChannel()
    {
        await using var db = CreateDb();
        var cmd = new CreateGuildCommand("Test", "Test", Guid.NewGuid(), "User", "user");

        var guildId = await new CreateGuildHandler(db).HandleAsync(cmd);

        Assert.Equal(1, await db.Guilds.CountAsync(g => g.Id == guildId));
        Assert.Equal(1, await db.Members.CountAsync(m => m.GuildId == guildId));
        Assert.Equal(1, await db.Channels.CountAsync(c => c.GuildId == guildId));
    }

    [Fact]
    public async Task Handle_ReturnsNewGuildId()
    {
        await using var db = CreateDb();
        var cmd = new CreateGuildCommand("Test", "Test", Guid.NewGuid(), "User", "user");

        var guildId = await new CreateGuildHandler(db).HandleAsync(cmd);

        Assert.NotEqual(Guid.Empty, guildId);
        Assert.True(await db.Guilds.AnyAsync(g => g.Id == guildId));
    }
}
