using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public static class AcceptInviteEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/invites/{code}/accept", async (
            string code,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            [FromHeader(Name = "X-Display-Name")] string displayName,
            [FromHeader(Name = "X-Username")] string username,
            AcceptInviteHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new AcceptInviteCommand(code, userId, displayName, username), ct);
            return Results.NoContent();
        });
}
