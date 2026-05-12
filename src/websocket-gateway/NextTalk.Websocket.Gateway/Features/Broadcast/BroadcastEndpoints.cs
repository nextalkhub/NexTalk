using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;
using System.Text.Json;

namespace NextTalk.Websocket.Gateway.Features.Broadcast;

/// <summary>
/// Internal broadcast endpoints — NOT exposed via Nginx (see nginx.conf: "location /internal { deny all }").
/// Accessible only from within the Docker/k8s network.
///
/// Two routes (matching the actual WsGatewayClient.cs contract in Guild Service):
///
///   POST /internal/broadcast/guild/{guildId}
///     Called by: Guild Service, Voice Service
///     Body: { "eventType": "member-kicked", "payload": { ... } }
///     Action: broadcasts GatewayEvent to SignalR group "guild:{guildId}"
///
///   POST /internal/broadcast
///     Called by: Messaging Service Outbox (BroadcastConsumer)
///     Body: { "eventType": "message.created", "guildId": "...", "payload": { ... } }
///     Action: broadcasts GatewayEvent to SignalR group "guild:{guildId}"
///     NOTE: guildId must be included in the body so WS Gateway can route to the correct group.
/// </summary>
public static class BroadcastEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/broadcast/guild/{guildId:guid}",
            async (Guid guildId, BroadcastGuildRequest req, IHubContext<ChatHub> hub) =>
            {
                await hub.Clients
                    .Group(ChatHub.GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { req.EventType, req.Payload });
                return Results.NoContent();
            });

        app.MapPost("/internal/broadcast",
            async (BroadcastRequest req, IHubContext<ChatHub> hub) =>
            {
                if (req.GuildId.HasValue)
                {
                    await hub.Clients
                        .Group(ChatHub.GuildGroup(req.GuildId.Value))
                        .SendAsync("GatewayEvent", new { req.EventType, req.Payload });
                }
                return Results.NoContent();
            });
    }

    public record BroadcastGuildRequest(string EventType, JsonElement? Payload);

    public record BroadcastRequest(string EventType, Guid? GuildId, JsonElement? Payload);
}
