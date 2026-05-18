using NexTalk.Guild.Service.Shared;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Members.BanMember;

public static class BanMemberEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/members/{targetUserId}/ban", async (
            Guid guildId,
            string targetUserId,
            ClaimsPrincipal user,
            BanMemberHandler handler,
            CancellationToken ct) =>
        {
            await handler.HandleAsync(
                new BanMemberCommand(guildId, targetUserId, user.GetUserId()), ct);
            return Results.NoContent();
        });
}
