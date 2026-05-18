using System.Security.Claims;
using NexTalk.Messaging.Service.Shared;

namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public static class DeleteMessageEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/messages/{messageId:guid}", async (
            Guid messageId,
            ClaimsPrincipal user,
            DeleteMessageHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new DeleteMessageCommand(messageId, user.GetUserId()), ct);
            return Results.NoContent();
        });
}
