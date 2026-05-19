using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public static class CreateGuildEndpoint
{
    /// <summary>Тело запроса для создания сервера.</summary>
    /// <param name="Name">Название сервера (2–32 символа).</param>
    public record Request(string Name);

    /// <summary>Ответ на создание сервера.</summary>
    /// <param name="Id">Идентификатор созданного сервера.</param>
    public record Response(Guid Id);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds", async (
            ClaimsPrincipal user,
            [FromBody] Request request,
            CreateGuildHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new CreateGuildCommand(
                request.Name,
                user.GetUserId(),
                user.GetDisplayName(),
                user.GetUsername());
            var guildId = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/guilds/{guildId}", new Response(guildId));
        })
        .WithTags("Guilds")
        .WithSummary("Создать сервер")
        .WithDescription(
            "Создает новый сервер (гильдию). Инициатор автоматически получает роль Owner и вступает в гильдию. " +
            "По умолчанию создается текстовый канал «general».")
        .Produces<Response>(201)
        .Produces(401);
}
