namespace NexTalk.Guild.Service.Features.Members.GetMembers;

public static class GetMembersEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds/{guildId:guid}/members", async (
            Guid guildId,
            GetMembersHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetMembersQuery(guildId), ct);
            return Results.Ok(result);
        });
}
