using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public static class AcceptInviteEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/invites/{code}/accept", async (
            string code,
            ClaimsPrincipal user,
            AcceptInviteHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new AcceptInviteCommand(
                code,
                user.GetUserId(),
                user.GetDisplayName(),
                user.GetUsername());
            var guild = await handler.HandleAsync(cmd, ct);
            return Results.Ok(guild);
        });
}
