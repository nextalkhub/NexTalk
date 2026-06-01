using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using NexTalk.Guild.Service.Shared.Responses;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Guilds.UpdateGuild;

public static class UpdateGuildEndpoint
{
    public record Request(string Name);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPatch("/guilds/{guildId:guid}", async (
            Guid guildId,
            [FromBody] Request request,
            ClaimsPrincipal user,
            UpdateGuildHandler handler,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BadRequestException("Name must not be empty.");

            var result = await handler.HandleAsync(
                new UpdateGuildCommand(guildId, request.Name.Trim(), user.GetUserId()), ct);
            return Results.Ok(result);
        })
        .WithTags("Guilds")
        .WithSummary("Обновить сервер")
        .Produces<GuildResponse>(200)
        .Produces(400)
        .Produces(401)
        .Produces(403)
        .Produces(404);
}
