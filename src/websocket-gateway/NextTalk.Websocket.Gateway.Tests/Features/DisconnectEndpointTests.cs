using System.Net;
using NextTalk.Websocket.Gateway.Tests.Infrastructure;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Features;

public class DisconnectEndpointTests(WsGatewayFactory factory) : IClassFixture<WsGatewayFactory>
{
    [Fact]
    public async Task DisconnectGuildUser_WhenUserNotConnected_Returns204()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsync(
            $"/internal/disconnect/guild/{Guid.NewGuid()}/user/{Guid.NewGuid()}",
            content: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
