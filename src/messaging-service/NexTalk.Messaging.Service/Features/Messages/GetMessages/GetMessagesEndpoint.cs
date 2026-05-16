using Microsoft.AspNetCore.Mvc;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public static class GetMessagesEndpoint
{
    private const int DefaultLimit = 50;
    private const int MaxLimit = 100;

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/channels/{channelId:guid}/messages", async (
            Guid channelId,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            [FromQuery] Guid? cursor,
            [FromQuery] int? limit,
            GetMessagesHandler handler,
            CancellationToken ct) =>
        {
            var effectiveLimit = limit ?? DefaultLimit;
            if (effectiveLimit <= 0 || effectiveLimit > MaxLimit)
                throw new BadRequestException($"limit must be between 1 and {MaxLimit}.");

            var result = await handler.HandleAsync(
                new GetMessagesQuery(channelId, userId, cursor, effectiveLimit), ct);
            return Results.Ok(result);
        });
}
