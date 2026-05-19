using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Members.BanMember;

public static class BanMemberEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/members/{targetUserId}/ban", async (
            Guid guildId,
            string targetUserId,
            ClaimsPrincipal user,
            BanMemberHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(
                new BanMemberCommand(guildId, targetUserId, user.GetUserId()), ct);
            return Results.NoContent();
        })
        .WithTags("Members")
        .WithSummary("Забанить участника")
        .WithDescription(
            "Исключает пользователя из гильдии и запрещает повторное вступление. " +
            "Требует роль Admin или Owner.")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(
            ("guildId", "Идентификатор гильдии."),
            ("targetUserId", "Zitadel sub баненного пользователя.")));
}
