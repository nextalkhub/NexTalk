using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public static class CreateGuildEndpoint
{
    public record Request(string Name, string DisplayName);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds", async (
            [FromBody] Request req,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            [FromHeader(Name = "X-Display-Name")] string displayName,
            [FromHeader(Name = "X-Username")] string username,
            CreateGuildHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new CreateGuildCommand(req.Name, req.DisplayName, userId, displayName, username);
            var guildId = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/guilds/{guildId}", new { Id = guildId });
        });
}
