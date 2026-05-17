using System.Net;
using NextTalk.Websocket.Gateway.Tests.Infrastructure;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Features;

public class HealthEndpointsTests(WsGatewayFactory factory) : IClassFixture<WsGatewayFactory>
{
    [Fact]
    public async Task Healthz_ReturnsOk_WithoutAuth()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/healthz");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Metrics_AllowAnonymous()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/metrics");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
