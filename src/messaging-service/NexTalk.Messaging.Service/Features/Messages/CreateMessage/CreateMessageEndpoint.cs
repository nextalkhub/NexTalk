using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Messaging.Service.Features.Messages.CreateMessage;

public static class CreateMessageEndpoint
{
    public record Request(
        Guid ChannelId,
        Guid GuildId,
        string AuthorId,
        string AuthorName,
        string Content);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/internal/messages", async (
            [FromBody] Request req,
            [FromHeader(Name = "X-Idempotency-Key")] string idempotencyKey,
            [FromHeader(Name = "X-Correlation-Id")] string? correlationId,
            CreateMessageHandler handler,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(idempotencyKey))
                return Results.BadRequest(new { error = "X-Idempotency-Key header is required." });

            var cmd = new CreateMessageCommand(
                req.ChannelId,
                req.GuildId,
                req.AuthorId,
                req.AuthorName,
                req.Content,
                idempotencyKey,
                correlationId ?? Guid.NewGuid().ToString());

            var result = await handler.HandleAsync(cmd, ct);

            return result.IsReplay
                ? Results.Ok(result.Message)
                : Results.Created($"/internal/messages/{result.Message.Id}", result.Message);
        }).AllowAnonymous().ExcludeFromDescription();
}
