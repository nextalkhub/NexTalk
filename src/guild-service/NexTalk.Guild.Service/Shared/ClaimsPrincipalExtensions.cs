using System.Security.Claims;

namespace NexTalk.Guild.Service.Shared;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Возвращает идентификатор вызывающего как сырую строку из claim sub.
    /// Zitadel выдает snowflake-строку (например "287040091499675137") - возвращаем её как есть.
    /// </summary>
    public static string GetUserId(this ClaimsPrincipal user) =>
        user.FindFirstValue("sub")
        ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("JWT is missing the 'sub' claim.");

    public static string GetDisplayName(this ClaimsPrincipal user) =>
        user.FindFirstValue("name") ?? string.Empty;

    public static string GetUsername(this ClaimsPrincipal user) =>
        user.FindFirstValue("preferred_username") ?? string.Empty;
}
