using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Voice.Service.Infrastructure;
using NexTalk.Voice.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Voice.Service.Tests.Features;

public class LeaveVoiceEndpointTests : IAsyncLifetime
{
    private readonly LeaveTestFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;
    public Task DisposeAsync() { _factory.Dispose(); return Task.CompletedTask; }

    private ISessionStore GetStore() => _factory.Services.GetRequiredService<ISessionStore>();

    // ─── Happy path ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Leave_WhenInChannel_Returns200()
    {
        const string userId = "user-leave-ok";
        var channelId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        GetStore().Join(userId, channelId, guildId);

        var client = _factory.CreateAuthenticatedClient(userId);
        var res = await client.PostAsync($"/voice/{channelId}/leave", null);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Leave_RemovesSessionFromStore()
    {
        const string userId = "user-leave-session";
        var channelId = Guid.NewGuid();
        GetStore().Join(userId, channelId, Guid.NewGuid());

        var client = _factory.CreateAuthenticatedClient(userId);
        await client.PostAsync($"/voice/{channelId}/leave", null);

        Assert.Null(GetStore().GetSession(userId));
    }

    [Fact]
    public async Task Leave_AfterJoin_SessionCleared()
    {
        const string userId = "user-leave-flow";
        var channelId = Guid.NewGuid();
        _factory.GuildAccess = new(true, Guid.NewGuid(), "voice", "member");

        var authed = _factory.CreateAuthenticatedClient(userId);

        // Simulate join by setting session directly (avoid LiveKit dependency)
        GetStore().Join(userId, channelId, _factory.GuildAccess.GuildId);

        var res = await authed.PostAsync($"/voice/{channelId}/leave", null);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Null(GetStore().GetSession(userId));
    }

    // ─── Ошибочные случаи ───────────────────────────────────────────────────

    [Fact]
    public async Task Leave_NotInChannel_Returns404()
    {
        const string userId = "user-leave-404";
        var channelId = Guid.NewGuid();
        // пользователь вообще не в сессии

        var client = _factory.CreateAuthenticatedClient(userId);
        var res = await client.PostAsync($"/voice/{channelId}/leave", null);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Leave_WrongChannel_Returns404()
    {
        const string userId = "user-wrong-channel";
        var correctChannel = Guid.NewGuid();
        var wrongChannel = Guid.NewGuid();
        GetStore().Join(userId, correctChannel, Guid.NewGuid());

        var client = _factory.CreateAuthenticatedClient(userId);
        var res = await client.PostAsync($"/voice/{wrongChannel}/leave", null);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Leave_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsync($"/voice/{Guid.NewGuid()}/leave", null);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ─── Фабрика ─────────────────────────────────────────────────────────────

    public sealed class LeaveTestFactory : VoiceServiceFactory
    {
        public GuildServiceClient.ChannelAccessResult? GuildAccess { get; set; }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            builder.ConfigureAppConfiguration(cfg =>
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["LiveKit:PublicUrl"] = "wss://livekit.test:7880",
                }));

            builder.ConfigureTestServices(services =>
            {
                services.AddHttpClient<WsGatewayClient>(c =>
                        c.BaseAddress = new Uri("http://fake-ws.local"))
                    .ConfigurePrimaryHttpMessageHandler(() => new AlwaysOkHandler());
            });
        }
    }

    private sealed class AlwaysOkHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent));
    }
}
