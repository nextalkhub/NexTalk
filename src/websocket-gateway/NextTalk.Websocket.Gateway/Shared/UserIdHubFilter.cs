using Microsoft.AspNetCore.SignalR;
using Serilog.Context;

namespace NextTalk.Websocket.Gateway.Shared;

public sealed class UserIdHubFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext ctx,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        using (LogContext.PushProperty("UserId", ctx.Context.User.GetUserId()))
            return await next(ctx);
    }

    public async Task OnConnectedAsync(HubLifetimeContext ctx, Func<HubLifetimeContext, Task> next)
    {
        using (LogContext.PushProperty("UserId", ctx.Context.User.GetUserId()))
            await next(ctx);
    }

    public async Task OnDisconnectedAsync(
        HubLifetimeContext ctx,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        using (LogContext.PushProperty("UserId", ctx.Context.User.GetUserId()))
            await next(ctx, exception);
    }
}
