using System;
using System.Threading;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public static class AssignRoleEndpoint
{
    public record Request(string Role);
    public record Response(Guid UserId, string Role);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPut("/guilds/{guildId:guid}/members/{targetUserId:guid}/role", async (
            Guid guildId,
            Guid targetUserId,
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
        });
}
