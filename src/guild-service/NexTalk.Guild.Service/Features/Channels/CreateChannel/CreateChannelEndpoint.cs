using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Responses;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Channels.CreateChannel;

public static class CreateChannelEndpoint
{
    /// <summary>Тело запроса для создания канала.</summary>
    /// <param name="Name">Название канала (1–32 символа).</param>
    /// <param name="Type">Тип канала: <c>text</c> - текстовый, <c>voice</c> - голосовой.</param>
    public record Request(string Name, string Type);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/channels", async (
            Guid guildId,
            ClaimsPrincipal user,
            [FromBody] Request request,
            CreateChannelHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(
                new CreateChannelCommand(guildId, request.Name, Enum.Parse<ChannelType>(request.Type, true), user.GetUserId()), ct);
            return Results.Created($"/guilds/{guildId}/channels/{result.Id}", result);
        })
        .WithTags("Channels")
        .WithSummary("Создать канал")
        .WithDescription(
            "Создает текстовый или голосовой канал в указанной гильдии. " +
            "Требует роль Admin или Owner.")
        .Produces<ChannelResponse>(201)
        .Produces(400)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("guildId", "Идентификатор гильдии, в которую добавляется канал.")));
}
