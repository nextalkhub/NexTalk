using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace NexTalk.Messaging.Service.Shared;

public sealed class ZitadelClaimsEnricher(
    ZitadelUserInfoService userInfoService,
    IHttpContextAccessor httpContextAccessor) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
            return principal;

        if (!NeedsEnrichment(principal))
            return principal;

        var sub = principal.FindFirstValue("sub")
               ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub))
            return principal;

        var token = ExtractToken(httpContextAccessor.HttpContext);
        if (string.IsNullOrEmpty(token))
            return principal;

        var expiry = ParseExpiry(principal);
        var ct = httpContextAccessor.HttpContext?.RequestAborted ?? CancellationToken.None;
        var info = await userInfoService.GetAsync(sub, token, expiry, ct);
        if (info is null)
            return principal;

        return Enrich(principal, info);
    }

    private static DateTimeOffset ParseExpiry(ClaimsPrincipal p) =>
        p.FindFirstValue("exp") is { } expStr && long.TryParse(expStr, out var exp)
            ? DateTimeOffset.FromUnixTimeSeconds(exp)
            : DateTimeOffset.UtcNow.AddHours(1);

    private static bool NeedsEnrichment(ClaimsPrincipal p) =>
        string.IsNullOrEmpty(p.FindFirstValue("name"))
        || string.IsNullOrEmpty(p.FindFirstValue("preferred_username"))
        || string.IsNullOrEmpty(p.FindFirstValue("email"));

    private static string? ExtractToken(HttpContext? ctx)
    {
        if (ctx is null) return null;
        var header = ctx.Request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return header["Bearer ".Length..].Trim();
        return ctx.Request.Query["access_token"].ToString() is { Length: > 0 } q ? q : null;
    }

    private static ClaimsPrincipal Enrich(ClaimsPrincipal principal, UserInfo info)
    {
        var identity = (ClaimsIdentity)principal.Identity!;
        var claims = identity.Claims
            .Where(c => c.Type is not "name" and not "preferred_username" and not "email")
            .Append(new Claim("name",               info.Name))
            .Append(new Claim("preferred_username", info.Username))
            .Append(new Claim("email",              info.Email));

        var newId = new ClaimsIdentity(claims, identity.AuthenticationType,
            identity.NameClaimType, identity.RoleClaimType);
        return new ClaimsPrincipal(newId);
    }
}
