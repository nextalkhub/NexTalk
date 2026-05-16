namespace NexTalk.Messaging.Service.Shared;

/// <summary>
/// Читает заголовок X-Deadline (UTC ISO 8601).
/// Если дедлайн уже истёк — сразу возвращает 504.
/// Иначе создаёт CancellationToken, привязанный к оставшемуся времени,
/// и подменяет HttpContext.RequestAborted — все хендлеры получат его автоматически.
/// </summary>
public sealed class DeadlineMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        if (!ctx.Request.Headers.TryGetValue("X-Deadline", out var header) ||
            !DateTimeOffset.TryParse(header, out var deadline))
        {
            await next(ctx);
            return;
        }

        var remaining = deadline - DateTimeOffset.UtcNow;
        if (remaining <= TimeSpan.Zero)
        {
            ctx.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
            await ctx.Response.WriteAsJsonAsync(new { error = "Request timeout", retryAfter = 5 });
            return;
        }

        // CancellationTokenSource принимает максимум ~49.7 дней; для сервис-сервис вызовов
        // разумный потолок — 30 сек. Всё что больше практически означает "нет дедлайна".
        var cappedRemaining = remaining < TimeSpan.FromSeconds(30) ? remaining : TimeSpan.FromSeconds(30);
        using var deadlineCts = new CancellationTokenSource(cappedRemaining);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ctx.RequestAborted, deadlineCts.Token);
        ctx.RequestAborted = linkedCts.Token;

        try
        {
            await next(ctx);
        }
        catch (OperationCanceledException) when (deadlineCts.IsCancellationRequested && !ctx.Response.HasStarted)
        {
            ctx.Response.StatusCode = StatusCodes.Status504GatewayTimeout;
            await ctx.Response.WriteAsJsonAsync(new { error = "Request timeout", retryAfter = 5 });
        }
    }
}
