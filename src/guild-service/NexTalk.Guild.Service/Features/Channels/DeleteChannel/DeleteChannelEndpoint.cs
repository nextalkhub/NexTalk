using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Channels.DeleteChannel;

public static class DeleteChannelEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}/channels/{channelId:guid}", async (
            Guid guildId,
            Guid channelId,
            ClaimsPrincipal user,
            DeleteChannelHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(
                new DeleteChannelCommand(guildId, channelId, user.GetUserId()), ct);
            return Results.NoContent();
        })
        .WithTags("Channels")
        .WithSummary("Удалить канал")
        .WithDescription("Удаляет канал из гильдии. Требует роль Admin или Owner.")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(
            ("guildId", "Идентификатор гильдии."),
            ("channelId", "Идентификатор удаляемого канала.")));
}
