using System.Net;
using NexTalk.Voice.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Voice.Service.Tests.Features;

public class HealthEndpointsTests(VoiceServiceFactory factory) : IClassFixture<VoiceServiceFactory>
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
