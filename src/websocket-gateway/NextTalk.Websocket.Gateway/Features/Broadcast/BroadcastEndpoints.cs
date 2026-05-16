using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;
using System.Text.Json;

namespace NextTalk.Websocket.Gateway.Features.Broadcast;

public static class BroadcastEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/broadcast/guild/{guildId:guid}",
            async (Guid guildId, BroadcastGuildRequest req, IHubContext<ChatHub> hub) =>
            {
                await hub.Clients
                    .Group(ChatHub.GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { req.Type, req.Payload });
                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();

        app.MapPost("/internal/broadcast",
            async (BroadcastRequest req, IHubContext<ChatHub> hub) =>
            {
                if (req.GuildId.HasValue)
                {
                    await hub.Clients
                        .Group(ChatHub.GuildGroup(req.GuildId.Value))
                        .SendAsync("GatewayEvent", new { req.Type, req.Payload });
                }
                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();
    }

    public record BroadcastGuildRequest(string Type, JsonElement? Payload);

    public record BroadcastRequest(string Type, Guid? GuildId, JsonElement? Payload);
}
