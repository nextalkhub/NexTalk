using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public static class CreateGuildEndpoint
{
    public record Request(string Name, string DisplayName);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds", async (
            ClaimsPrincipal user,
            [FromBody] Request req,
            CreateGuildHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new CreateGuildCommand(
                req.Name,
                req.DisplayName,
                user.GetUserId(),
                user.GetDisplayName(),
                user.GetUsername());
            var guildId = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/guilds/{guildId}", new { Id = guildId });
        });
}
