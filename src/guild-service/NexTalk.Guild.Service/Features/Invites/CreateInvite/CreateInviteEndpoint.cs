using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public static class CreateInviteEndpoint
{
    public record Request(int? ExpiresInSeconds, int? MaxUses);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/invites", async (
            Guid guildId,
            [FromBody] Request req,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            CreateInviteHandler handler,
            CancellationToken ct) =>
        {
            var expiresIn = req.ExpiresInSeconds.HasValue
                ? TimeSpan.FromSeconds(req.ExpiresInSeconds.Value)
                : (TimeSpan?)null;

            var cmd = new CreateInviteCommand(guildId, expiresIn, req.MaxUses, userId);
            var result = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/invites/{result.Code}", result);
        });
}
