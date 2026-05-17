namespace NexTalk.Voice.Service.Infrastructure;

/// <summary>
/// DelegatingHandler для HTTP-клиента к Guild Service.
/// Добавляет заголовок X-Deadline = UtcNow + 1.5 сек — меньше, чем Polly Timeout (2s),
/// поэтому DeadlineMiddleware на стороне Guild Service выстрелит раньше Polly и вернёт 504.
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
