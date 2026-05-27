using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.DeleteInvite;

public static class DeleteInviteEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}/invites/{code}", async (
            Guid guildId,
            string code,
            ClaimsPrincipal user,
            DeleteInviteHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new DeleteInviteCommand(guildId, code, user.GetUserId()), ct);
            return Results.NoContent();
        })
        .WithTags("Invites")
        .WithSummary("Удалить приглашение")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404);
}
