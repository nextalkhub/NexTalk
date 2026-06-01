using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Responses;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Channels.RenameChannel;

public static class RenameChannelEndpoint
{
    public record Request(string Name);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPatch("/guilds/{guildId:guid}/channels/{channelId:guid}", async (
            Guid guildId,
            Guid channelId,
            ClaimsPrincipal user,
            [FromBody] Request request,
            RenameChannelHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(
                new RenameChannelCommand(guildId, channelId, request.Name, user.GetUserId()), ct);
            return Results.Ok(result);
        })
        .WithTags("Channels")
        .WithSummary("Переименовать канал")
        .WithDescription("Изменяет название канала. Требует роль Admin или Owner.")
        .Produces<ChannelResponse>(200)
        .Produces(400)
        .Produces(401)
        .Produces(403)
        .Produces(404);
}
