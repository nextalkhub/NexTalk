using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Guilds.GetUserGuilds;

public static class GetUserGuildsEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds", async (
            [FromHeader(Name = "X-User-Id")] Guid userId,
            GetUserGuildsHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetUserGuildsQuery(userId), ct);
            return Results.Ok(result);
        });
}
