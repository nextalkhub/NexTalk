using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Features.Disconnect;

/// <summary>
/// Internal disconnect endpoints — NOT exposed via Nginx.
///
/// Matching the actual WsGatewayClient.cs contract used by Guild Service:
///
///   POST /internal/disconnect/{userId}
///     Called by: Guild Service (kick — полное отключение)
///     Action: отправляет force.disconnect GatewayEvent в соединение пользователя
///
///   POST /internal/disconnect/guild/{guildId}/user/{userId}
///     Called by: Guild Service (ban — отключение из конкретной гильдии)
///     Action: отправляет guild.force.disconnect GatewayEvent с id забаненной гильдии
/// </summary>
public static class DisconnectEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/disconnect/{userId:guid}",
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
            }).AllowAnonymous().ExcludeFromDescription();

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
            }).AllowAnonymous().ExcludeFromDescription();
    }
}
