using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Guilds.DeleteGuild;

public static class DeleteGuildEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}", async (
            Guid guildId,
            ClaimsPrincipal user,
            DeleteGuildHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new DeleteGuildCommand(guildId, user.GetUserId()), ct);
            return Results.NoContent();
        });
}
