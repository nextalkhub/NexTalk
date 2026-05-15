using System.Security.Claims;

namespace NexTalk.Guild.Service.Shared;

/// <summary>
/// Принудительно берет X-User-Id из JWT claim sub, игнорируя значение от клиента
/// Zitadel выдает числовые sub строки (snowflake ID), но нам нужен Guid .
/// Должен быть зарегистрирован после UseAuthentication(), но перед маппингом эндпоинтов.
/// </summary>
public sealed class JwtSubToHeaderMiddleware
{
    // Случайный фиксированный namespace для генерации Guid внутри системы. Не менять.
    private static readonly Guid Namespace = new("3f8a1b6c-2d4e-4f7a-9b1c-5e6d7f8a9b0c");

    private readonly RequestDelegate _next;

    public JwtSubToHeaderMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx)
    {
        if (ctx.User.Identity?.IsAuthenticated == true)
        {
            var sub = ctx.User.FindFirstValue("sub")
                      ?? ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!string.IsNullOrEmpty(sub))
            {
                // Если sub уже является Guid (например, в тестах) — используем напрямую.
                // Zitadel выдает snowflake-идентификаторы (не Guid),- поэтому DeriveGuid
                var userId = Guid.TryParse(sub, out var g) ? g : DeriveGuid(sub);
                ctx.Request.Headers["X-User-Id"] = userId.ToString();
            }

            var displayName = ctx.User.FindFirstValue("name");
            var username    = ctx.User.FindFirstValue("preferred_username");

            if (displayName is not null) ctx.Request.Headers["X-Display-Name"] = displayName;
            if (username    is not null) ctx.Request.Headers["X-Username"]      = username;
        }

        await _next(ctx);
    }

    // UUIDv5 (RFC 4122 §4.3) - SHA1(namespace || name) с установленными битами версии и варианта.
    // Детерминированный: один и тот же sub всегда маппится в один и тот же Guid.
    private static Guid DeriveGuid(string sub)
    {
        Span<byte> nsBytes = stackalloc byte[16];
        if (!Namespace.TryWriteBytes(nsBytes))
            throw new InvalidOperationException("Namespace Guid write failed.");

        SwapEndian(nsBytes);

        var subBytes = System.Text.Encoding.UTF8.GetBytes(sub);
        var input = new byte[16 + subBytes.Length];
        nsBytes.CopyTo(input);
        subBytes.CopyTo(input, 16);

        Span<byte> hash = stackalloc byte[20];
        System.Security.Cryptography.SHA1.HashData(input, hash);

        Span<byte> result = stackalloc byte[16];
        hash[..16].CopyTo(result);

        // Устанавливает версию (5) и вариант по RFC 4122.
        result[6] = (byte)((result[6] & 0x0F) | 0x50);
        result[8] = (byte)((result[8] & 0x3F) | 0x80);

        SwapEndian(result);
        return new Guid(result);
    }

    private static void SwapEndian(Span<byte> g)
    {
        (g[0], g[3]) = (g[3], g[0]);
        (g[1], g[2]) = (g[2], g[1]);
        (g[4], g[5]) = (g[5], g[4]);
        (g[6], g[7]) = (g[7], g[6]);
    }
}
