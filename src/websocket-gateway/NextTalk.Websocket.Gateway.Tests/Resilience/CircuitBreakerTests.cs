using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.CircuitBreaker;
using Xunit;

namespace NextTalk.Websocket.Gateway.Tests.Resilience;

/// <summary>
/// Integration-тест для Polly CircuitBreaker в HTTP-клиентах.
/// Использует те же параметры, что и production-конфигурация в Program.cs,
/// но укорочены: MinThroughput=5, FailureRatio=0.5, SamplingDuration=1s, BreakDuration=500ms.
/// Цель — убедиться, что state-machine работает: 5 фейлов → OPEN → fail-fast → HalfOpen → Closed.
/// </summary>
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

        // 5 запросов с фейлами — должны попасть в downstream и накопить статистику.
        for (var i = 0; i < 5; i++)
        {
            var r = await http.GetAsync("/probe");
            Assert.Equal(HttpStatusCode.InternalServerError, r.StatusCode);
        }
        Assert.Equal(5, realCallsToDownstream);

        // 6-й запрос — circuit OPEN, до downstream не должен дойти.
        await Assert.ThrowsAsync<BrokenCircuitException>(() => http.GetAsync("/probe"));
        Assert.Equal(5, realCallsToDownstream);

        // Ждём BreakDuration → HalfOpen → пробный запрос пройдёт.
        downstreamFails = false;
        await Task.Delay(TimeSpan.FromMilliseconds(700));

        var probe = await http.GetAsync("/probe");
        Assert.Equal(HttpStatusCode.OK, probe.StatusCode);
        Assert.Equal(6, realCallsToDownstream);

        // CLOSED — последующие запросы идут штатно.
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
