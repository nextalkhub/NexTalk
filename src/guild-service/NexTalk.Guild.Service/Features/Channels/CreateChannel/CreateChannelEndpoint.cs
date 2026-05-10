using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public static class CreateChannelEndpoint
{
    public record Request(string Name, string Type);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/channels", async (
            Guid guildId,
            [FromBody] Request req,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            CreateChannelHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new CreateChannelCommand(guildId, req.Name, req.Type, userId), ct);
            return Results.Created($"/guilds/{guildId}/channels/{result.Id}", result);
        });
}
