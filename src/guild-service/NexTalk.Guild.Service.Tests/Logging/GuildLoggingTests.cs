using System.Net.Http.Headers;
using System.Net.Http.Json;
using NexTalk.Guild.Service.Tests.Infrastructure;
using Serilog.Events;
using Xunit;

namespace NexTalk.Guild.Service.Tests.Logging;

public class GuildLoggingTests : IAsyncLifetime
{
    private readonly LoggingGuildServiceFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;
    public Task DisposeAsync() { _factory.Dispose(); return Task.CompletedTask; }

    private HttpClient AuthClient(string userId = "log-user-1") =>
        _factory.CreateAuthenticatedClient(userId);

    // ─── CreateGuild ─────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateGuild_EmitsGuildCreatedLog()
    {
        var client = AuthClient();
        await client.PostAsJsonAsync("/guilds", new { Name = "LogTestGuild" });

        Assert.True(_factory.LogSink.HasMessageTemplate("Guild created:"),
            "Ожидался лог «Guild created:» при создании гильдии");
    }

    [Fact]
    public async Task CreateGuild_LogLevel_IsInformation()
    {
        var client = AuthClient();
        await client.PostAsJsonAsync("/guilds", new { Name = "LogLevelGuild" });

        Assert.True(_factory.LogSink.HasLevel(LogEventLevel.Information, "Guild created:"),
            "Лог «Guild created:» должен быть уровня Information");
    }

    [Fact]
    public async Task CreateGuild_LogContainsGuildName()
    {
        var client = AuthClient();
        await client.PostAsJsonAsync("/guilds", new { Name = "UniqueGuildName_Logging" });

        Assert.True(_factory.LogSink.HasPropertyValue("GuildName", "UniqueGuildName_Logging"),
            "Ожидалось свойство GuildName в логе");
    }

    [Fact]
    public async Task CreateGuild_LogContainsOwnerId()
    {
        const string userId = "owner-log-user";
        var client = AuthClient(userId);
        await client.PostAsJsonAsync("/guilds", new { Name = "OwnerLogGuild" });

        Assert.True(_factory.LogSink.HasPropertyValue("OwnerId", userId),
            "Ожидалось свойство OwnerId в логе");
    }

    [Fact]
    public async Task CreateGuild_NoErrorLogs_OnHappyPath()
    {
        var client = AuthClient();
        await client.PostAsJsonAsync("/guilds", new { Name = "NoErrorGuild" });

        var errors = _factory.LogSink.Events
            .Where(e => e.Level >= LogEventLevel.Error)
            .ToList();

        Assert.Empty(errors);
    }

    // ─── CreateChannel ───────────────────────────────────────────────────────

    [Fact]
    public async Task CreateChannel_EmitsChannelCreatedLog()
    {
        // Сначала создаем гильдию чтобы получить guildId
        var client = AuthClient("channel-log-owner");
        var guildRes = await client.PostAsJsonAsync("/guilds", new { Name = "ChannelLogGuild" });
        var guild = await guildRes.Content.ReadFromJsonAsync<GuildResponse>();

        _factory.LogSink.Events.ToList(); // flush before assert
        var before = _factory.LogSink.Events.Count;

        await client.PostAsJsonAsync(
            $"/guilds/{guild!.Id}/channels",
            new { Name = "log-channel", Type = "text" });

        Assert.True(_factory.LogSink.HasMessageTemplate("Channel created:"),
            "Ожидался лог «Channel created:» при создании канала");
    }

    [Fact]
    public async Task CreateChannel_LogContainsGuildId()
    {
        var client = AuthClient("channel-guild-log");
        var guildRes = await client.PostAsJsonAsync("/guilds", new { Name = "GuildForChannelLog" });
        var guild = await guildRes.Content.ReadFromJsonAsync<GuildResponse>();

        await client.PostAsJsonAsync(
            $"/guilds/{guild!.Id}/channels",
            new { Name = "ch-log", Type = "text" });

        Assert.True(_factory.LogSink.HasPropertyValue("GuildId", guild.Id.ToString()),
            "Ожидалось свойство GuildId в логе создания канала");
    }

    private record GuildResponse(Guid Id, string Name);
}
