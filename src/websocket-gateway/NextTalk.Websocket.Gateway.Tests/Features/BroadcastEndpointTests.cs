using System.Net;
using System.Net.Http.Json;
using NextTalk.Websocket.Gateway.Tests.Infrastructure;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Features;

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
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/internal/broadcast",
            new { Type = "test.event", GuildId = Guid.NewGuid(), Payload = new { hello = "world" } });

        Assert.NotEqual(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.NotFound, HttpStatusCode.Unauthorized });
    }
}
