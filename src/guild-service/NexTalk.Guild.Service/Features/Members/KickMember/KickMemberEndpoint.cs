using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Members.KickMember;

public static class KickMemberEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapDelete("/guilds/{guildId:guid}/members/{targetUserId:guid}", async (
            Guid guildId,
            Guid targetUserId,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            KickMemberHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new KickMemberCommand(guildId, targetUserId, userId), ct);
            return Results.NoContent();
        });
}
