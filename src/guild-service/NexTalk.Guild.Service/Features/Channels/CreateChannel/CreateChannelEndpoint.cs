using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public static class CreateChannelEndpoint
{
    public record Request(string Name, string Type);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/channels", async (
            Guid guildId,
            ClaimsPrincipal user,
            [FromBody] Request request,
            CreateChannelHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(
                new CreateChannelCommand(guildId, request.Name, Enum.Parse<ChannelType>(request.Type, true), user.GetUserId()), ct);
            return Results.Created($"/guilds/{guildId}/channels/{result.Id}", result);
        });
}
