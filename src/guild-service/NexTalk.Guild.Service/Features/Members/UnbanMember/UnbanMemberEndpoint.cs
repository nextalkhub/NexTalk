using System.Security.Claims;
using NexTalk.Guild.Service.Shared;

namespace NexTalk.Guild.Service.Features.Members.UnbanMember;

public static class UnbanMemberEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}/bans/{targetUserId}", async (
            Guid guildId,
            string targetUserId,
            ClaimsPrincipal user,
            UnbanMemberHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(
                new UnbanMemberCommand(guildId, targetUserId, user.GetUserId()), ct);
            return Results.NoContent();
        })
        .WithTags("Members")
        .WithSummary("Разбанить участника")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404);
}
