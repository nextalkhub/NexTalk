using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Features.Disconnect;

/// <summary>
/// Internal disconnect endpoints — NOT exposed via Nginx.
///
/// Matching the actual WsGatewayClient.cs contract used by Guild Service:
///
///   POST /internal/disconnect/user/{userId}
///     Called by: Guild Service (kick — global disconnect)
///     Action: sends force.disconnect GatewayEvent to the user's connection
///
///   POST /internal/disconnect/guild/{guildId}/user/{userId}
///     Called by: Guild Service (ban — guild-scoped disconnect)
///     Action: sends guild.force.disconnect GatewayEvent with the banned guildId
/// </summary>
public static class DisconnectEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/disconnect/user/{userId:guid}",
            async (Guid userId, IHubContext<ChatHub> hub, ConnectionManager connections) =>
            {
                var entry = connections.Get(userId);
                if (entry is not null)
                {
                    await hub.Clients
                        .Client(entry.ConnectionId)
                        .SendAsync("GatewayEvent", new { Type = "force.disconnect" });
                }
                return Results.NoContent();
            });

        app.MapPost("/internal/disconnect/guild/{guildId:guid}/user/{userId:guid}",
            async (Guid guildId, Guid userId, IHubContext<ChatHub> hub, ConnectionManager connections) =>
            {
                var entry = connections.Get(userId);
                if (entry is not null)
                {
                    await hub.Clients
                        .Client(entry.ConnectionId)
                        .SendAsync("GatewayEvent", new { Type = "guild.force.disconnect", GuildId = guildId });
                }
                return Results.NoContent();
            });
    }
}
