using System.Security.Claims;
using NexTalk.Guild.Service.Shared;

namespace NexTalk.Guild.Service.Features.Members.GetBans;

public static class GetBansEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds/{guildId:guid}/bans", async (
            Guid guildId,
            ClaimsPrincipal user,
            GetBansHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(
                new GetBansQuery(guildId, user.GetUserId()), ct);
            return Results.Ok(result);
        })
        .WithTags("Members")
        .WithSummary("Список банов сервера")
        .Produces<IReadOnlyList<GetBansHandler.BanDto>>(200)
        .Produces(401)
        .Produces(403)
        .Produces(404);
}
