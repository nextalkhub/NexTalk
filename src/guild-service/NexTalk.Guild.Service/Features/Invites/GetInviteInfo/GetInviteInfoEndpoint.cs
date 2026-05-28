using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Responses;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.GetInviteInfo;

public static class GetInviteInfoEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/invites/{code}", async (
            string code,
            ClaimsPrincipal user,
            GetInviteInfoHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetInviteInfoQuery(code, user.GetUserId()), ct);
            return Results.Ok(result);
        })
        .WithTags("Invites")
        .WithSummary("Информация об инвайте")
        .WithDescription(
            "Возвращает публичный превью приглашения. " +
            "403 — пользователь забанен, 410 — инвайт истёк или исчерпан, 404 — не найден.")
        .Produces<InviteInfoResponse>(200)
        .Produces(403)
        .Produces(404)
        .Produces(410)
        .WithMetadata(new ParameterDoc(("code", "12-символьный код приглашения.")));
}
