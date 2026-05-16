using System.Security.Claims;

namespace NexTalk.Voice.Service.Shared;

public static class ClaimsPrincipalExtensions
{
    // Фиксированный namespace для вывода UUIDv5 - должен совпадать с guild-service, messaging-service и ws-gateway.
    // Изменение сломает перекрестные FK (members.user_id vs sessions).
    private static readonly Guid Namespace = new("3f8a1b6c-2d4e-4f7a-9b1c-5e6d7f8a9b0c");

    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue("sub")
                  ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? throw new InvalidOperationException("JWT не содержит claim 'sub'.");
        return Guid.TryParse(sub, out var g) ? g : DeriveGuid(sub);
    }

    public static string GetDisplayName(this ClaimsPrincipal user) =>
        user.FindFirstValue("name") ?? string.Empty;

    public static string GetUsername(this ClaimsPrincipal user) =>
        user.FindFirstValue("preferred_username") ?? string.Empty;

    // UUIDv5 по RFC 4122 §4.3: SHA-1(namespace || name) с выставленными битами версии и варианта.
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
