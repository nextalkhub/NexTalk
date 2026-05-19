namespace NexTalk.Guild.Service.Features.Internal.CheckChannelAccess;

public static class CheckChannelAccessEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/internal/channels/{channelId:guid}/access", async (
            Guid channelId,
            string userId,
            CheckChannelAccessHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new CheckChannelAccessQuery(channelId, userId), ct);

            if (result is null)
                return Results.NotFound(new { error = "Channel not found." });

            return Results.Ok(result);
        }).AllowAnonymous().ExcludeFromDescription();
}
