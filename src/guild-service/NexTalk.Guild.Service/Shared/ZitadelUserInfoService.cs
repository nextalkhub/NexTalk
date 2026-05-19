using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace NexTalk.Guild.Service.Shared;

public sealed class ZitadelUserInfoService
{
    private readonly IHttpClientFactory _http;
    private readonly IMemoryCache _cache;
    private readonly string _userInfoUri;
    private readonly string _hostHeader;

    public ZitadelUserInfoService(IHttpClientFactory http, IMemoryCache cache, IConfiguration cfg)
    {
        _http = http;
        _cache = cache;
        var metadata = cfg["Zitadel:MetadataAddress"]
            ?? throw new InvalidOperationException("Zitadel:MetadataAddress not configured");
        var authority = cfg["Zitadel:Authority"]
            ?? throw new InvalidOperationException("Zitadel:Authority not configured");
        _userInfoUri = new Uri(metadata).GetLeftPart(UriPartial.Authority) + "/oidc/v1/userinfo";
        _hostHeader  = new Uri(authority).Authority;
    }

    // Кэшируем до истечения access_token (exp claim) — 1 вызов на пользователя за сессию.
    public async Task<UserInfo?> GetAsync(string sub, string accessToken, DateTimeOffset tokenExpiry, CancellationToken ct = default)
    {
        var key = $"zitadel:ui:{sub}";
        if (_cache.TryGetValue(key, out UserInfo? hit))
            return hit;

        var client = _http.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Get, _userInfoUri);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        req.Headers.Host = _hostHeader;

        using var resp = await client.SendAsync(req, ct);
        if (!resp.IsSuccessStatusCode)
            return null;

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var r = doc.RootElement;
        var info = new UserInfo(
            Name:     r.TryGetProperty("name",               out var n) ? n.GetString() ?? "" : "",
            Username: r.TryGetProperty("preferred_username", out var u) ? u.GetString() ?? "" : "",
            Email:    r.TryGetProperty("email",              out var e) ? e.GetString() ?? "" : "");

        _cache.Set(key, info, tokenExpiry);
        return info;
    }
}

public sealed record UserInfo(string Name, string Username, string Email);
