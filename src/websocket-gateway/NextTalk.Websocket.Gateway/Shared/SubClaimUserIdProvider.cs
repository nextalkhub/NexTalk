using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace NextTalk.Websocket.Gateway.Shared;

/// <summary>
/// Маппит Zitadel JWT claim "sub" в SignalR UserIdentifier
/// </summary>
public sealed class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirstValue("sub") 
               ?? connection.User?.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
