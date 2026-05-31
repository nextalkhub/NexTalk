using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Responses;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public static class AcceptInviteEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/invites/{code}/accept", async (
            string code,
            ClaimsPrincipal user,
            AcceptInviteHandler handler,
            CancellationToken ct) =>
        {
            var cmd = new AcceptInviteCommand(
                code,
                user.GetUserId(),
                user.GetDisplayName(),
                user.GetUsername());
            var guild = await handler.HandleAsync(cmd, ct);
            return Results.Ok(guild);
        })
        .WithTags("Invites")
        .WithSummary("Вступить по приглашению")
        .WithDescription(
            "Добавляет текущего пользователя в гильдию по коду из ссылки-приглашения. " +
            "Код - 12-символьная строка base64url из URL вида /invite/{code}. " +
            "Возвращает данные гильдии, в которую вступил пользователь.")
        .Produces<AcceptInviteResponse>(200)
        .Produces(400)
        .Produces(401)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("code", "12-символьный код из ссылки-приглашения (base64url).")));
}
