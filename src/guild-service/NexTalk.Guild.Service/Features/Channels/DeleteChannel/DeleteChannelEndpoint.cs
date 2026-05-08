using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Channels.DeleteChannel;

public static class DeleteChannelEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}/channels/{channelId:guid}", async (
            Guid guildId,
            Guid channelId,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            DeleteChannelHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new DeleteChannelCommand(guildId, channelId, userId), ct);
            return Results.NoContent();
        });
}
