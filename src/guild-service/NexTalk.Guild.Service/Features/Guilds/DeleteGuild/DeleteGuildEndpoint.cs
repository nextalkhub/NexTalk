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
            await handler.HandleAsync(
                new DeleteGuildCommand(guildId, user.GetUserId()), ct);
            return Results.NoContent();
        })
        .WithTags("Guilds")
        .WithSummary("Удалить сервер")
        .WithDescription(
            "Каскадно удаляет гильдию вместе с каналами, участниками, приглашениями и банами. " +
            "Только Owner вправе удалить сервер.")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("guildId", "Идентификатор удаляемой гильдии.")));
}
