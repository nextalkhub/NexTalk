using Microsoft.AspNetCore.Mvc;

namespace NexTalk.Guild.Service.Features.Members.BanMember;

public static class BanMemberEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/members/{targetUserId:guid}/ban", async (
            Guid guildId,
            Guid targetUserId,
            [FromHeader(Name = "X-User-Id")] Guid userId,
            BanMemberHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(new BanMemberCommand(guildId, targetUserId, userId), ct);
            return Results.NoContent();
        });
}
