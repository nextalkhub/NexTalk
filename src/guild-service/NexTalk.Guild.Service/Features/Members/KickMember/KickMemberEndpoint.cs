using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Members.KickMember;

public static class KickMemberEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}/members/{targetUserId}", async (
            Guid guildId,
            string targetUserId,
            ClaimsPrincipal user,
            KickMemberHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(
                new KickMemberCommand(guildId, targetUserId, user.GetUserId()), ct);
            return Results.NoContent();
        })
        .WithTags("Members")
        .WithSummary("Исключить участника")
        .WithDescription(
            "Удаляет пользователя из гильдии. Требует роль Admin или Owner. " +
            "Нельзя исключить Owner гильдии.")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(
            ("guildId", "Идентификатор гильдии."),
            ("targetUserId", "Zitadel sub исключаемого пользователя.")));
}
