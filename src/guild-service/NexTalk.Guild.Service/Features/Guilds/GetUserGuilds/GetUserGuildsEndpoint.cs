using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Responses;
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
        })
        .WithTags("Guilds")
        .WithSummary("Список серверов пользователя")
        .WithDescription("Возвращает все гильдии, в которых состоит текущий пользователь.")
        .Produces<GuildResponse[]>(200)
        .Produces(401);
}
