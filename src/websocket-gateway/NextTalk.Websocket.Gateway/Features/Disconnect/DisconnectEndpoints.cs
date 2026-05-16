using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Features.Disconnect;

/// <summary>
/// Internal disconnect endpoints — NOT exposed via Nginx.
///
///   POST /internal/disconnect/{userId}
///     Полное отключение пользователя от WS Gateway (резерв для будущих сценариев).
///     Action: отправляет force.disconnect GatewayEvent в соединение пользователя.
///
///   POST /internal/disconnect/guild/{guildId}/user/{userId}
///     Called by: Guild Service при бане или кике участника.
///     Action: отправляет guild.force.disconnect пользователю,
///             затем рассылает member.left всей гильдии.
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
                        .SendAsync("GatewayEvent", new { Type = "force.disconnect", Payload = (object?)null });
                }
                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();

        app.MapPost("/internal/disconnect/guild/{guildId:guid}/user/{userId:guid}",
            async (Guid guildId, Guid userId, IHubContext<ChatHub> hub, ConnectionManager connections) =>
            {
                var entry = connections.Get(userId);
                if (entry is not null)
                {
                    // Уведомляем пользователя о бане — он должен покинуть гильдию на клиенте.
                    await hub.Clients
                        .Client(entry.ConnectionId)
                        .SendAsync("GatewayEvent", new { Type = "guild.force.disconnect", Payload = new { GuildId = guildId } });

                    // Удаляем из SignalR-группы сразу — иначе пользователь продолжит получать
                    // события гильдии до физического разрыва соединения.
                    await hub.Groups.RemoveFromGroupAsync(entry.ConnectionId, ChatHub.GuildGroup(guildId));
                }

                // Уведомляем участников гильдии — пользователь покинул сервер.
                await hub.Clients
                    .Group(ChatHub.GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { Type = "member.left", Payload = new { UserId = userId, GuildId = guildId } });

                return Results.NoContent();
            }).AllowAnonymous().ExcludeFromDescription();
    }
}
