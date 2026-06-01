using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using NextTalk.Websocket.Gateway.Tests.Infrastructure;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Features;

public class BroadcastEndToEndTests : IClassFixture<BroadcastEndToEndTests.E2EFactory>
{
    private readonly E2EFactory _factory;

    public BroadcastEndToEndTests(E2EFactory factory) => _factory = factory;

    [Fact]
    public async Task BroadcastToGuild_DeliversGatewayEventToSignalRClientInGroup()
    {
        var userId = E2EFactory.UserId;
        var guildId = E2EFactory.GuildId;
        var token = TestJwt.Generate(userId);

        var hub = new HubConnectionBuilder()
            .WithUrl($"{_factory.Server.BaseAddress}hubs/chat?access_token={token}", opts =>
            {
                opts.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                opts.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.LongPolling;
            })
            .Build();

        var received = new TaskCompletionSource<JsonElement>();
        hub.On<JsonElement>("GatewayEvent", evt =>
        {
            if (evt.TryGetProperty("type", out var type) && type.GetString() == "message.created")
                received.TrySetResult(evt);
        });

        await hub.StartAsync();
        try
        {
            using var client = _factory.CreateClient();

            // OnConnectedAsync добавляет соединение в группу гильдии асинхронно
            // (через HTTP-вызов в guild-service сквозь Polly-пайплайн), поэтому
            // фиксированная задержка перед broadcast - гонка, флакающая под нагрузкой CI.
            // Ретраим broadcast, пока клиент не получит событие или не выйдет таймаут.
            var deadline = DateTime.UtcNow.AddSeconds(10);
            while (DateTime.UtcNow < deadline && !received.Task.IsCompleted)
            {
                var resp = await client.PostAsJsonAsync(
                    $"/internal/broadcast/guild/{guildId}",
                    new { Type = "message.created", Payload = new { messageId = "m-1", content = "hi" } });
                Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);

                await Task.WhenAny(received.Task, Task.Delay(250));
            }

            Assert.True(received.Task.IsCompleted,
                "SignalR-клиент не получил broadcast в отведённое время");

            var evt = await received.Task;
            Assert.Equal("message.created", evt.GetProperty("type").GetString());
            Assert.Equal("m-1", evt.GetProperty("payload").GetProperty("messageId").GetString());
        }
        finally
        {
            await hub.StopAsync();
            await hub.DisposeAsync();
        }
    }

    public sealed class E2EFactory : WsGatewayFactory
    {
        public static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        public static readonly Guid GuildId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);

            builder.ConfigureTestServices(services =>
            {
                services.AddHttpClient<NextTalk.Websocket.Gateway.Infrastructure.GuildServiceClient>(c =>
                        c.BaseAddress = new Uri("http://fake-guild.local"))
                    .ConfigurePrimaryHttpMessageHandler(() => new FakeGuildHandler(UserId, GuildId));
            });
        }
    }

    private sealed class FakeGuildHandler(Guid userId, Guid guildId) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var path = request.RequestUri!.AbsolutePath;
            if (path.EndsWith($"/internal/users/{userId}/guilds", StringComparison.OrdinalIgnoreCase))
            {
                var payload = new[]
                {
                    new
                    {
                        id = guildId,
                        name = "test",
                        displayName = "Test",
                        ownerId = userId,
                        createdAt = DateTimeOffset.UtcNow,
                    }
                };
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = JsonContent.Create(payload),
                });
            }
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }
}
