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

public class JoinVoiceEndpointTests : IAsyncLifetime
{
    private readonly JoinTestFactory _factory = new();

    public Task InitializeAsync() => Task.CompletedTask;
    public Task DisposeAsync() { _factory.Dispose(); return Task.CompletedTask; }

    // ─── Happy path ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Join_VoiceChannel_Returns200()
    {
        var channelId = Guid.NewGuid();
        _factory.GuildAccess = new(true, Guid.NewGuid(), "voice", "member");

        var client = _factory.CreateAuthenticatedClient("user-1");
        var res = await client.PostAsync($"/voice/{channelId}/join", null);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Join_ResponseContainsTokenAndUrl()
    {
        var channelId = Guid.NewGuid();
        _factory.GuildAccess = new(true, Guid.NewGuid(), "voice", "member");

        var client = _factory.CreateAuthenticatedClient("user-1");
        var res = await client.PostAsync($"/voice/{channelId}/join", null);

        var body = await res.Content.ReadFromJsonAsync<JoinResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.Token));
        Assert.Equal("wss://livekit.test:7880", body.LiveKitUrl);
        Assert.Equal(channelId, body.ChannelId);
    }

    [Fact]
    public async Task Join_RegistersSessionInStore()
    {
        var channelId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        _factory.GuildAccess = new(true, guildId, "voice", "member");

        var client = _factory.CreateAuthenticatedClient("user-join-session");
        await client.PostAsync($"/voice/{channelId}/join", null);

        var store = _factory.Services.GetRequiredService<ISessionStore>();
        var session = store.GetSession("user-join-session");
        Assert.NotNull(session);
        Assert.Equal(channelId, session.ChannelId);
        Assert.Equal(guildId, session.GuildId);
    }

    // ─── Ошибочные случаи ───────────────────────────────────────────────────

    [Fact]
    public async Task Join_ChannelNotFound_Returns404()
    {
        var channelId = Guid.NewGuid();
        _factory.GuildAccess = null; // null → 404

        var client = _factory.CreateAuthenticatedClient("user-1");
        var res = await client.PostAsync($"/voice/{channelId}/join", null);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Join_AccessDenied_Returns403()
    {
        var channelId = Guid.NewGuid();
        _factory.GuildAccess = new(false, Guid.NewGuid(), "voice", null);

        var client = _factory.CreateAuthenticatedClient("user-1");
        var res = await client.PostAsync($"/voice/{channelId}/join", null);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Join_TextChannel_Returns400()
    {
        var channelId = Guid.NewGuid();
        _factory.GuildAccess = new(true, Guid.NewGuid(), "text", "member");

        var client = _factory.CreateAuthenticatedClient("user-1");
        var res = await client.PostAsync($"/voice/{channelId}/join", null);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Join_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsync($"/voice/{Guid.NewGuid()}/join", null);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ─── Фабрика с поддельным GuildServiceClient ────────────────────────────

    public sealed class JoinTestFactory : VoiceServiceFactory
    {
        // null = канал не найден (404), иначе возвращается как тело ответа
        public GuildServiceClient.ChannelAccessResult? GuildAccess { get; set; } =
            new(true, Guid.NewGuid(), "voice", "member");

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
                services.AddHttpClient<GuildServiceClient>(c =>
                        c.BaseAddress = new Uri("http://fake-guild.local"))
                    .ConfigurePrimaryHttpMessageHandler(() => new FakeGuildHandler(this));

                services.AddHttpClient<WsGatewayClient>(c =>
                        c.BaseAddress = new Uri("http://fake-ws.local"))
                    .ConfigurePrimaryHttpMessageHandler(() => new AlwaysOkHandler());
            });
        }
    }

    private sealed class FakeGuildHandler(JoinTestFactory factory) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct)
        {
            if (factory.GuildAccess is null)
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(factory.GuildAccess),
            });
        }
    }

    private sealed class AlwaysOkHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent));
    }

    private record JoinResponse(string Token, string LiveKitUrl, Guid ChannelId, Guid GuildId);
}
