namespace NextTalk.Websocket.Gateway.Shared;

/// <summary>
/// Читает заголовок X-Deadline (UTC ISO 8601).
/// Если дедлайн уже истек - сразу возвращает 504.
/// Иначе создает CancellationToken, привязанный к оставшемуся времени,
/// и подменяет HttpContext.RequestAborted - все хендлеры получат его автоматически.
/// </summary>
public sealed class DeadlineMiddleware
{
    private readonly RequestDelegate _next;

    public DeadlineMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!ctx.Request.Headers.TryGetValue("X-Deadline", out var header) ||
            !DateTimeOffset.TryParse(header, out var deadline))
        {
            await _next(ctx);
            return;
        }

        var remaining = deadline - DateTimeOffset.UtcNow;
        if (remaining <= TimeSpan.Zero)
        {
            ctx.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
            await ctx.Response.WriteAsJsonAsync(new { error = "Request timeout", retryAfter = 5 });
            return;
        }
        
        var cappedRemaining = remaining < TimeSpan.FromSeconds(30) ? remaining : TimeSpan.FromSeconds(30);
        using var deadlineCts = new CancellationTokenSource(cappedRemaining);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ctx.RequestAborted, deadlineCts.Token);
        ctx.RequestAborted = linkedCts.Token;

        try
        {
            await _next(ctx);
        }
        catch (OperationCanceledException) when (deadlineCts.IsCancellationRequested && !ctx.Response.HasStarted)
        {
            ctx.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
            await ctx.Response.WriteAsJsonAsync(new { error = "Request timeout", retryAfter = 5 });
        }
    }
}
