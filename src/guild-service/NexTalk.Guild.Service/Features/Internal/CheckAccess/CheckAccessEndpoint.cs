using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Features.Internal.CheckAccess;

public static class CheckAccessEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/internal/guilds/{guildId:guid}/access", async (
            Guid guildId,
            Guid userId,
            string requiredRole,
            CheckAccessHandler handler,
            CancellationToken ct) =>
        {
            if (!Enum.TryParse<MemberRole>(requiredRole, ignoreCase: true, out var role))
                return Results.BadRequest(new { error = "Invalid role value." });

            var result = await handler.HandleAsync(new CheckAccessQuery(guildId, userId, role), ct);
            return Results.Ok(result);
        });
}
