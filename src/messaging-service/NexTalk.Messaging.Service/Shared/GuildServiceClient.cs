using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Shared;

public class GuildServiceClient(HttpClient http, IHttpContextAccessor httpContextAccessor) : IGuildServiceClient
{
    private record GuildAccessResponse(bool HasAccess, Guid GuildId);
    private record GuildAccessWithRoleResponse(bool HasAccess, Guid GuildId, string ChannelType, string? Role);

    public async Task<ChannelAccessResult> CheckChannelAccessAsync(Guid channelId, string userId, CancellationToken ct = default)
    {
        var req = new HttpRequestMessage(HttpMethod.Get,
            $"/internal/channels/{channelId}/access?userId={userId}");

        // Propagate correlation headers for distributed tracing (Flow 11 step 5).
        var ctx = httpContextAccessor.HttpContext;
        if (ctx is not null)
        {
            var correlationId = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                ?? ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
                ?? ctx.TraceIdentifier;
            req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

            var deadline = ctx.Request.Headers["X-Deadline"].FirstOrDefault();
            if (!string.IsNullOrEmpty(deadline))
                req.Headers.TryAddWithoutValidation("X-Deadline", deadline);
        }

        using var resp = await http.SendAsync(req, ct);

        if (resp.StatusCode == HttpStatusCode.NotFound)
            return new ChannelAccessResult(false, null);

        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<GuildAccessResponse>(ct);
        return body is null
            ? new ChannelAccessResult(false, null)
            : new ChannelAccessResult(body.HasAccess, body.GuildId);
    }

    // Проверка Admin/Owner через CheckChannelAccess (Flow 14 - удаление чужого сообщения).
    // guild-service возвращает Role в теле - проверяем здесь.
    public virtual async Task RequireAdminOrOwnerAsync(Guid channelId, string userId, CancellationToken ct = default)
    {
        var req = new HttpRequestMessage(HttpMethod.Get,
            $"/internal/channels/{channelId}/access?userId={userId}");

        var ctx = httpContextAccessor.HttpContext;
        if (ctx is not null)
        {
            var correlationId = ctx.Request.Headers["X-Correlation-Id"].FirstOrDefault()
                ?? ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
                ?? ctx.TraceIdentifier;
            req.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

            var deadline = ctx.Request.Headers["X-Deadline"].FirstOrDefault();
            if (!string.IsNullOrEmpty(deadline))
                req.Headers.TryAddWithoutValidation("X-Deadline", deadline);
        }

        using var resp = await http.SendAsync(req, ct);

        if (resp.StatusCode == HttpStatusCode.NotFound || !resp.IsSuccessStatusCode)
            throw new ForbiddenException("Access denied.");

        var body = await resp.Content.ReadFromJsonAsync<GuildAccessWithRoleResponse>(ct);
        if (body is null || !body.HasAccess || (body.Role != "Admin" && body.Role != "Owner"))
            throw new ForbiddenException("Only Admin or Owner can delete messages of other users.");
    }
}
