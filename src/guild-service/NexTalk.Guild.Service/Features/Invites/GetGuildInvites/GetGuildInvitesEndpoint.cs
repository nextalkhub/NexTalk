using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.GetGuildInvites;

public static class GetGuildInvitesEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds/{guildId:guid}/invites", async (
            Guid guildId,
            ClaimsPrincipal user,
            GetGuildInvitesHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetGuildInvitesQuery(guildId, user.GetUserId()), ct);
            return Results.Ok(result);
        })
        .WithTags("Invites")
        .WithSummary("Получить приглашения гильдии")
        .Produces<IReadOnlyList<GetGuildInvitesHandler.InviteDto>>(200)
        .Produces(401)
        .Produces(403)
        .Produces(404);
}
