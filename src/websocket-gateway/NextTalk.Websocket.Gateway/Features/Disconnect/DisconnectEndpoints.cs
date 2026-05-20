using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Features.Disconnect;

public static class DisconnectEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/disconnect/guild/{guildId:guid}/user/{userId}",
            async (Guid guildId, string userId, IHubContext<ChatHub> hub, ConnectionManager connections, ILoggerFactory loggerFactory) =>
            {
                var logger = loggerFactory.CreateLogger(nameof(DisconnectEndpoints));
                logger.LogInformation("Force disconnect: user={UserId} guild={GuildId}", userId, guildId);

                var entry = connections.Get(userId);
                if (entry is not null)
                {
                    // Уведомляем пользователя о бане
                    await hub.Clients
                        .Client(entry.ConnectionId)
                        .SendAsync("GatewayEvent", new { Type = "guild.force.disconnect", Payload = new { GuildId = guildId } });

                    await hub.Groups.RemoveFromGroupAsync(entry.ConnectionId, ChatHub.GuildGroup(guildId));
                }

                // Уведомляем участников гильдии
                await hub.Clients
                    .Group(ChatHub.GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { Type = "member.left", Payload = new { UserId = userId, GuildId = guildId } });

                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();
    }
}
