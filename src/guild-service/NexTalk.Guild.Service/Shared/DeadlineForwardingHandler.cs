namespace NexTalk.Guild.Service.Shared;

/// <summary>
/// DelegatingHandler для исходящих HTTP-клиентов Guild Service.
/// Добавляет заголовок X-Deadline = UtcNow + 1.5 сек — меньше, чем Polly Timeout (2s),
/// поэтому DeadlineMiddleware на стороне получателя выстрелит раньше Polly и вернёт 504.
/// </summary>
public sealed class DeadlineForwardingHandler : DelegatingHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        request.Headers.TryAddWithoutValidation(
            "X-Deadline",
            DateTimeOffset.UtcNow.AddSeconds(1.5).ToString("O"));

        return base.SendAsync(request, ct);
    }
}
