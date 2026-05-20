using System.Security.Claims;
using NexTalk.Messaging.Service.Shared;

namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public static class DeleteMessageEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/messages/{messageId:guid}", async (
            Guid messageId,
            ClaimsPrincipal user,
            HttpContext httpContext,
            DeleteMessageHandler handler,
            CancellationToken ct) =>
        {
            var correlationId = httpContext.Request.Headers["X-Request-Id"].FirstOrDefault()
                ?? httpContext.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                ?? httpContext.TraceIdentifier;
            await handler.HandleAsync(new DeleteMessageCommand(messageId, user.GetUserId(), correlationId), ct);
            return Results.NoContent();
        })
        .WithTags("Messages")
        .WithSummary("Удалить сообщение")
        .WithDescription(
            "Помечает сообщение как удаленное. Автор может удалить свое сообщение; " +
            "Admin и Owner гильдии — любое сообщение в своем канале.")
        .Produces(204)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("messageId", "Идентификатор удаляемого сообщения (UUIDv7).")));
}
