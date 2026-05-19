using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;
using System.Text.Json;

namespace NextTalk.Websocket.Gateway.Features.Broadcast;

public static class BroadcastEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/broadcast/guild/{guildId:guid}",
            async (Guid guildId, BroadcastGuildRequest request, IHubContext<ChatHub> hub, ILoggerFactory loggerFactory) =>
            {
                var logger = loggerFactory.CreateLogger<BroadcastEndpoints>();
                logger.LogDebug("Broadcast event={EventType} guild={GuildId}", request.Type, guildId);

                await hub.Clients
                    .Group(ChatHub.GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { request.Type, request.Payload });
                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();
    }

    public record BroadcastGuildRequest(string Type, JsonElement? Payload);
}
