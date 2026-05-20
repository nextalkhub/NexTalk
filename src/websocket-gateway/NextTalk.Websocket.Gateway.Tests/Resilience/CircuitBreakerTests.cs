using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.CircuitBreaker;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Resilience;

public class CircuitBreakerTests
{
    [Fact]
    public async Task FiveConsecutiveFailures_OpensCircuit_ThenRecoversAfterBreakDuration()
    {
        var downstreamFails = true;
        var realCallsToDownstream = 0;

        var services = new ServiceCollection();
        services.AddHttpClient("test", c => c.BaseAddress = new Uri("http://downstream.local"))
            .ConfigurePrimaryHttpMessageHandler(() => new FakeDownstreamHandler(
                onRequest: () =>
                {
                    Interlocked.Increment(ref realCallsToDownstream);
                    return downstreamFails
                        ? new HttpResponseMessage(HttpStatusCode.InternalServerError)
                        : new HttpResponseMessage(HttpStatusCode.OK);
                }))
            .AddResilienceHandler("test", pipeline =>
            {
                pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
                {
                    SamplingDuration = TimeSpan.FromSeconds(1),
                    FailureRatio = 0.5,
                    MinimumThroughput = 5,
                    BreakDuration = TimeSpan.FromMilliseconds(500),
                });
            });

        await using var sp = services.BuildServiceProvider();
        var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient("test");

        for (var i = 0; i < 5; i++)
        {
            var r = await http.GetAsync("/probe");
            Assert.Equal(HttpStatusCode.InternalServerError, r.StatusCode);
        }
        Assert.Equal(5, realCallsToDownstream);

        await Assert.ThrowsAsync<BrokenCircuitException>(() => http.GetAsync("/probe"));
        Assert.Equal(5, realCallsToDownstream);

        downstreamFails = false;
        await Task.Delay(TimeSpan.FromMilliseconds(700));

        var probe = await http.GetAsync("/probe");
        Assert.Equal(HttpStatusCode.OK, probe.StatusCode);
        Assert.Equal(6, realCallsToDownstream);

        var ok = await http.GetAsync("/probe");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.Equal(7, realCallsToDownstream);
    }

    private sealed class FakeDownstreamHandler(Func<HttpResponseMessage> onRequest) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(onRequest());
    }
}
