using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Features.Disconnect;

/// <summary>
/// Internal эндпоинты дл принудительного отключения
///
/// Соответствуют контракту WsGatewayClient.cs, используемому Guild Service:
///
///   POST /internal/disconnect/user/{userId}
///     Вызывает: Guild Service (kick - полное отключение)
///     Действие: отправляет событие force.disconnect на соединение пользователя
///
///   POST /internal/disconnect/guild/{guildId}/user/{userId}
///     Вызывает: Guild Service (ban - отключение от конкретной гильдии)
///     Действие: отправляет событие guild.force.disconnect с Id забаненной гильдии
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
