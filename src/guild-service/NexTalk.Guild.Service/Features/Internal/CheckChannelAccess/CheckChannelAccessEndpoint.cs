namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public static class CheckChannelAccessEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/internal/channels/{channelId:guid}/check-access", async (
            Guid channelId,
            Guid userId,
            CheckChannelAccessHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new CheckChannelAccessQuery(channelId, userId), ct);
            return Results.Ok(result);
        });
}
