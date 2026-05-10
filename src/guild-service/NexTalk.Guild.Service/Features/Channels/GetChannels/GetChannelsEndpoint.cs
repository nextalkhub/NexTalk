namespace NexTalk.Guild.Service.Features.Channels.GetChannels;

public static class GetChannelsEndpoint
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/guilds/{guildId:guid}/channels", async (
            Guid guildId,
            GetChannelsHandler handler,
            CancellationToken ct) =>
        {
            var result = await handler.HandleAsync(new GetChannelsQuery(guildId), ct);
            return Results.Ok(result);
        });
}
