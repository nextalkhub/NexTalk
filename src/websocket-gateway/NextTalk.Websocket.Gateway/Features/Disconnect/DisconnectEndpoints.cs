using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Features.Disconnect;

public static class DisconnectEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/internal/disconnect/guild/{guildId:guid}/user/{userId}",
            async (Guid guildId, string userId, IHubContext<ChatHub> hub, IConnectionManager connections, ILoggerFactory loggerFactory) =>
            {
                var logger = loggerFactory.CreateLogger(nameof(DisconnectEndpoints));
                logger.LogInformation("Force disconnect: user={UserId} guild={GuildId}", userId, guildId);

                var connectionIds = connections.GetConnectionIds(userId);
                foreach (var connId in connectionIds)
                {
                    await hub.Clients
                        .Client(connId)
                        .SendAsync("GatewayEvent", new { Type = "guild.force.disconnect", Payload = new { GuildId = guildId } });

                    await hub.Groups.RemoveFromGroupAsync(connId, ChatHub.GuildGroup(guildId));
                }

                // Гильдия больше не в наборе пользователя - иначе PresenceMonitor пришлет
                // в нее presence.offline после disconnect, а юзер уже не участник.
                connections.RemoveGuild(userId, guildId);

                // Уведомляем участников гильдии
                await hub.Clients
                    .Group(ChatHub.GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { Type = "member.left", Payload = new { UserId = userId, GuildId = guildId } });

                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();
    }
}
