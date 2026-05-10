namespace NexTalk.Guild.Service.Features.Internal.GetGuildMembers;

public static class GetGuildMembersEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/internal/guilds/{guildId:guid}/members", async (
            Guid guildId,
            GetGuildMembersHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetGuildMembersQuery(guildId), ct);
            return Results.Ok(result);
        });
}
