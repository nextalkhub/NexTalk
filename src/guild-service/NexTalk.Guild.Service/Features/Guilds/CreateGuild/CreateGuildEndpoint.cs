using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Responses;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Guilds.CreateGuild;

public static class CreateGuildEndpoint
{
    /// <summary>Тело запроса для создания сервера.</summary>
    /// <param name="Name">Название сервера (2–32 символа).</param>
    public record Request(string Name);

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
            // Возвращаем полный объект гильдии (id+name+ownerId+createdAt), чтобы клиент
            // мог сразу показать её в списке без перезагрузки.
            var guild = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/guilds/{guild.Id}", guild);
        })
        .WithTags("Guilds")
        .WithSummary("Создать сервер")
        .WithDescription(
            "Создает новый сервер (гильдию). Инициатор автоматически получает роль Owner и вступает в гильдию. " +
            "По умолчанию создается текстовый канал «general».")
        .Produces<GuildResponse>(201)
        .Produces(401);
}
