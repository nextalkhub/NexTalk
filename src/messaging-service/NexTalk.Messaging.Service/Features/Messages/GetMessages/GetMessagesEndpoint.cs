using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public static class GetMessagesEndpoint
{
    private const int DefaultLimit = 50;
    private const int MaxLimit = 100;

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/channels/{channelId:guid}/messages", async (
            Guid channelId,
            ClaimsPrincipal user,
            [FromQuery] Guid? cursor,
            [FromQuery] int? limit,
            GetMessagesHandler handler,
            CancellationToken ct) =>
        {
            var effectiveLimit = limit ?? DefaultLimit;
            if (effectiveLimit <= 0 || effectiveLimit > MaxLimit)
                throw new BadRequestException($"limit must be between 1 and {MaxLimit}.");

            var result = await handler.HandleAsync(
                new GetMessagesQuery(channelId, user.GetUserId(), cursor, effectiveLimit), ct);
            return Results.Ok(result);
        })
        .WithTags("Messages")
        .WithSummary("История сообщений канала")
        .WithDescription(
            "Возвращает сообщения канала, отсортированные от новых к старым (курсорная пагинация). " +
            "Параметр cursor — id последнего полученного сообщения; следующий запрос вернет сообщения до него. " +
            $"Диапазон limit: 1–{MaxLimit}, по умолчанию {DefaultLimit}. " +
            "Если nextCursor в ответе не null — есть еще страницы.")
        .Produces<GetMessagesResponse>(200)
        .Produces(400)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(
            ("channelId", "Идентификатор канала."),
            ("cursor", "Id последнего полученного сообщения (UUIDv7). Запрос вернет сообщения старее него. Не указывать для первой страницы."),
            ("limit", $"Число сообщений на странице. Допустимые значения: 1–{MaxLimit}. По умолчанию {DefaultLimit}.")));
}
