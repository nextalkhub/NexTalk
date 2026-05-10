using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Guilds.DeleteGuild;

public static class DeleteGuildEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}", async (
            Guid guildId,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            DeleteGuildHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new DeleteGuildCommand(guildId, userId), ct);
            return Results.NoContent();
        });
}
