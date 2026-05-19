using System.Net;
using System.Net.Http.Json;
using NextTalk.Websocket.Gateway.Tests.Infrastructure;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Features;

/// <summary>
/// Internal broadcast эндпоинт без JWT (закрыт сетью + nginx).
/// При отсутствии подписчиков в группе - 204 No Content (SignalR просто игнорирует send).
/// </summary>
public class BroadcastEndpointTests(WsGatewayFactory factory) : IClassFixture<WsGatewayFactory>
{
    [Fact]
    public async Task BroadcastToGuild_WithNoSubscribers_Returns204()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            $"/internal/broadcast/guild/{Guid.NewGuid()}",
            new { Type = "test.event", Payload = new { hello = "world" } });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task BareInternalBroadcast_Removed_NotReachableAsAnonymous()
    {
        // Старый dead-endpoint удален. Запрос анонимного клиента к /internal/broadcast
        // не должен попадать в 204 (как раньше), а должен отбиваться маршрутизатором
        // (404) или фолбэк-политикой авторизации (401) - оба варианта валидны.
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/internal/broadcast",
            new { Type = "test.event", GuildId = Guid.NewGuid(), Payload = new { hello = "world" } });

        Assert.NotEqual(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.NotFound, HttpStatusCode.Unauthorized });
    }
}
