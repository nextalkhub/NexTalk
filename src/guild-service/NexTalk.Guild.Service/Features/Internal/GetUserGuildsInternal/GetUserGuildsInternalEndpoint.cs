namespace NexTalk.Guild.Service.Features.Internal.GetUserGuildsInternal;

public static class GetUserGuildsInternalEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/internal/users/{userId:guid}/guilds", async (
            Guid userId,
            GetUserGuildsInternalHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetUserGuildsInternalQuery(userId), ct);
            return Results.Ok(result);
        });
}
