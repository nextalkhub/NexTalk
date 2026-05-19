using NexTalk.Guild.Service.Shared.Responses;

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
        })
        .WithTags("Channels")
        .WithSummary("Список каналов гильдии")
        .WithDescription("Возвращает все каналы гильдии. Пользователь должен быть членом гильдии.")
        .Produces<ChannelResponse[]>(200)
        .Produces(401)
        .Produces(403)
        .Produces(404)
        .WithMetadata(new ParameterDoc(("guildId", "Идентификатор гильдии.")));
}
