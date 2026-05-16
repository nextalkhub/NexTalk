using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public static class DeleteMessageEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/api/messages/{messageId:guid}", async (
            Guid messageId,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            DeleteMessageHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new DeleteMessageCommand(messageId, userId), ct);
            return Results.NoContent();
        });
}
