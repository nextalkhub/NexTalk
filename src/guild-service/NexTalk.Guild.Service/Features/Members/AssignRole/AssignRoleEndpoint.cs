using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public static class AssignRoleEndpoint
{
    public record Request(string Role);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/guilds/{guildId:guid}/members/{targetUserId:guid}/role", async (
            Guid guildId,
            Guid targetUserId,
            [FromBody] Request req,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            AssignRoleHandler handler,
            CancellationToken ct) =>
        {
            if (!Enum.TryParse<MemberRole>(req.Role, ignoreCase: true, out var role))
                return Results.BadRequest(new { error = "Invalid role value." });

            await handler.HandleAsync(new AssignRoleCommand(guildId, targetUserId, role, userId), ct);
            return Results.NoContent();
        });
}
