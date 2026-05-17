using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;

namespace NextTalk.Websocket.Gateway.Shared;

/// <summary>
/// Фоновый сервис, сканирующий PresenceTracker каждые 10 секунд.
/// Пользователи, чей последний heartbeat превысил OfflineTimeout, помечаются офлайн
/// и из guild-группы получают событие presence.offline
/// </summary>
public sealed class PresenceMonitor : BackgroundService
{
    private static readonly TimeSpan ScanInterval = TimeSpan.FromSeconds(10);

    private readonly PresenceTracker _tracker;
    private readonly ConnectionManager _connections;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly TimeSpan _offlineTimeout;
    private readonly ILogger<PresenceMonitor> _logger;

    public PresenceMonitor(
        PresenceTracker tracker, 
        ConnectionManager connections, 
        IHubContext<ChatHub> hubContext,
        IOptions<PresenceOptions> options,
        ILogger<PresenceMonitor> logger)
    {
        _tracker = tracker;
        _connections = connections;
        _hubContext = hubContext;
        _offlineTimeout = TimeSpan.FromSeconds(options.Value.OfflineTimeout);
        _logger = logger;
    }
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(ScanInterval, stoppingToken);
            
            var staleUsers = _tracker.GetStale(_offlineTimeout);
            foreach (var userId in staleUsers)
            {
                _tracker.Remove(userId);
                
                var entry = _connections.Get(userId);
                if (entry is not null)
                {
                    foreach (var guildId in entry.GuildIds)
                    {
                        await _hubContext.Clients
                            .Group(ChatHub.GuildGroup(guildId))
                            .SendAsync(
                                "GatewayEvent",
                                new { Type = "presence.offline", UserId = userId },
                                stoppingToken);
                    }
                }
                
                _logger.LogDebug("User {UserId} went offline: heartbeat timeout", userId);
            }
        }
    }
}