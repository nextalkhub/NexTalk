using System.Security.Claims;

namespace NextTalk.Websocket.Gateway.Shared;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Возвращает идентификатор вызывающего как сырую строку из claim sub.
    /// </summary>
    public static string GetUserId(this ClaimsPrincipal? user) =>
        user?.FindFirstValue("sub")
        ?? user?.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? string.Empty;

    public static string GetDisplayName(this ClaimsPrincipal? user) =>
        user?.FindFirstValue("name")
        ?? user?.FindFirstValue("preferred_username")
        ?? "Unknown";
}
