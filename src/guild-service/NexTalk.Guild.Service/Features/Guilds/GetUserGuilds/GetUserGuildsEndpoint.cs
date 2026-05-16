using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Guilds.GetUserGuilds;

public static class GetUserGuildsEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds", async (
            ClaimsPrincipal user,
            GetUserGuildsHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetUserGuildsQuery(user.GetUserId()), ct);
            return Results.Ok(result);
        });
}
