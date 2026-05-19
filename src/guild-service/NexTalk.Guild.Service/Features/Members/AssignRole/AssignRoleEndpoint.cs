using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public static class AssignRoleEndpoint
{
    /// <summary>Тело запроса для изменения роли участника.</summary>
    /// <param name="Role">Новая роль: <c>Member</c>, <c>Admin</c> или <c>Owner</c> (без учета регистра).</param>
    public record Request(string Role);

    /// <summary>Результат смены роли.</summary>
    /// <param name="UserId">Zitadel sub участника, которому изменена роль.</param>
    /// <param name="Role">Назначенная роль.</param>
    public record Response(string UserId, string Role);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/guilds/{guildId:guid}/members/{targetUserId}/role", async (
            Guid guildId,
            string targetUserId,
            ClaimsPrincipal user,
            [FromBody] Request req,
            AssignRoleHandler handler,
            CancellationToken ct) =>
        {
            if (!Enum.TryParse<MemberRole>(req.Role, ignoreCase: true, out var role))
                return Results.BadRequest(new { error = "Invalid role value." });

            await handler.HandleAsync(
                new AssignRoleCommand(guildId, targetUserId, role, user.GetUserId()), ct);
            return Results.Ok(new Response(targetUserId, req.Role));
        })
        .WithTags("Members")
        .WithSummary("Изменить роль участника")
        .WithDescription(
            "Назначает роль Member, Admin или Owner участнику гильдии. " +
            "Owner вправе назначать любые роли; Admin - только Member/Admin. " +
            "При передаче роли Owner текущий владелец автоматически понижается до Admin.")
        .Produces<Response>(200)
        .Produces(400)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(
            ("guildId", "Идентификатор гильдии."),
            ("targetUserId", "Zitadel sub пользователя, которому меняется роль.")));
}
