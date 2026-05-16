using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public static class CreateInviteEndpoint
{
    public record Request(int? ExpiresInSeconds, int? MaxUses);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/invites", async (
            Guid guildId,
            ClaimsPrincipal user,
            [FromBody] Request req,
            CreateInviteHandler handler,
            CancellationToken ct) =>
        {
            var expiresIn = req.ExpiresInSeconds.HasValue
                ? TimeSpan.FromSeconds(req.ExpiresInSeconds.Value)
                : (TimeSpan?)null;

            var cmd = new CreateInviteCommand(guildId, expiresIn, req.MaxUses, user.GetUserId());
            var result = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/invites/{result.Code}", result);
        });
}
