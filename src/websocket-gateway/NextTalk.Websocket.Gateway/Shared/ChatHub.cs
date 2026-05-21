using Microsoft.AspNetCore.SignalR;
using NextTalk.Websocket.Gateway.Features.Chat.SendMessage;
using NextTalk.Websocket.Gateway.Infrastructure;

namespace NextTalk.Websocket.Gateway.Shared;

public sealed class ChatHub : Hub
{
    private readonly IConnectionManager _connections;
    private readonly IPresenceTracker _presence;
    private readonly SendMessageHandler _sendMessageHandler;
    private readonly GuildServiceClient _guildClient;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(
        IConnectionManager connections,
        IPresenceTracker presence,
        SendMessageHandler sendMessageHandler,
        GuildServiceClient guildClient,
        ILogger<ChatHub> logger)
    {
        _connections = connections;
        _presence = presence;
        _sendMessageHandler = sendMessageHandler;
        _guildClient = guildClient;
        _logger = logger;
    }

    public static string GuildGroup(Guid guidId) => $"guild:{guidId}";

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
        {
            Context.Abort();
            return;
        }

        var correlationId = Context.GetHttpContext()?.Request.Headers["X-Request-Id"].FirstOrDefault()
            ?? Context.GetHttpContext()?.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? Guid.NewGuid().ToString();
        var guilds = await _guildClient.GetUserGuildsAsync(userId, correlationId);
        var guildIds = guilds.Select(guild => guild.Id).ToList();

        _connections.Register(userId, Context.ConnectionId, guildIds);

        foreach (var guildId in guildIds)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GuildGroup(guildId));
        }

        var justOnline = _presence.SetOnline(userId);
        if (justOnline)
        {
            foreach (var guildId in guildIds)
            {
                await Clients.Group(GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { Type = "presence.online", Payload = new { UserId = userId } });
            }
        }

        _logger.LogInformation("User {UserId} connected ({ConnectionId}), guilds: {GuildCount}",
            userId, Context.ConnectionId, guilds.Count);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        _presence.Remove(userId);

        if (_connections.TryUnregister(userId, out var entry) && entry is not null)
        {
            foreach (var guildId in entry.GuildIds)
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, GuildGroup(guildId));
                await Clients.Group(GuildGroup(guildId))
                    .SendAsync("GatewayEvent", new { Type = "presence.offline", Payload = new { UserId = userId } });
            }
        }

        if (exception is not null)
            _logger.LogWarning(exception, "User {UserId} disconnected with error ({ConnectionId})", userId, Context.ConnectionId);
        else
            _logger.LogInformation("User {UserId} disconnected ({ConnectionId})", userId, Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Отправляет сообщение в текстовый канал.
    /// </summary>
    public async Task SendMessage(Guid channelId, string content, string idempotencyKey)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
        {
            await Clients.Caller.SendAsync("Error", new { Message = "Unauthorized" });
            return;
        }

        var correlationId = Guid.NewGuid().ToString();
        var command = new SendMessageCommand(
            channelId, content, idempotencyKey,
            userId, GetDisplayName(), correlationId);

        var result = await _sendMessageHandler.HandleAsync(command, Context.ConnectionAborted);

        if (!result.Success)
        {
            await Clients.Caller.SendAsync("Error", new { Message = result.Error });
            return;
        }

        await Clients.Caller.SendAsync("MessageAck", new
        {
            result.Message?.Id,
            ChannelId = channelId,
            IdempotencyKey = idempotencyKey,
        });
    }

    public Task Heartbeat()
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
            _presence.SetOnline(userId);

        return Task.CompletedTask;
    }

    private string GetUserId() => Context.User.GetUserId();

    private string GetDisplayName() => Context.User.GetDisplayName();
}
