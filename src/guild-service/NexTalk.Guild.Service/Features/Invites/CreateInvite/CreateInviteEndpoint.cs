using Microsoft.AspNetCore.Mvc;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;
using System.Security.Claims;

namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public static class CreateInviteEndpoint
{
    // ExpiresIn is the spec format ("24h", "7d", "30m", "3600s") — string with unit suffix.
    // ExpiresInSeconds is the legacy numeric form, kept for back-compat.
    public record Request(string? ExpiresIn, int? ExpiresInSeconds, int? MaxUses);

    public static void Map(IEndpointRouteBuilder app) =>
        app.MapPost("/guilds/{guildId:guid}/invites", async (
            Guid guildId,
            ClaimsPrincipal user,
            [FromBody] Request req,
            CreateInviteHandler handler,
            CancellationToken ct) =>
        {
            var expiresIn = ParseExpiresIn(req);

            var cmd = new CreateInviteCommand(guildId, expiresIn, req.MaxUses, user.GetUserId());
            var result = await handler.HandleAsync(cmd, ct);
            return Results.Created($"/invites/{result.Code}", result);
        });

    internal static TimeSpan? ParseExpiresIn(Request req)
    {
        if (!string.IsNullOrWhiteSpace(req.ExpiresIn))
            return ParseDurationString(req.ExpiresIn);

        return req.ExpiresInSeconds.HasValue
            ? TimeSpan.FromSeconds(req.ExpiresInSeconds.Value)
            : null;
    }

    // Accepts "<number><unit>" where unit is one of s/m/h/d. Examples: "24h", "7d", "30m", "3600s".
    private static TimeSpan ParseDurationString(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.Length < 2)
            throw new BadRequestException($"Invalid expiresIn '{value}'. Use formats like '24h', '7d', '30m'.");

        var unit = trimmed[^1];
        var numberPart = trimmed[..^1];

        if (!long.TryParse(numberPart, out var n) || n <= 0)
            throw new BadRequestException($"Invalid expiresIn '{value}'. Use formats like '24h', '7d', '30m'.");

        return unit switch
        {
            's' => TimeSpan.FromSeconds(n),
            'm' => TimeSpan.FromMinutes(n),
            'h' => TimeSpan.FromHours(n),
            'd' => TimeSpan.FromDays(n),
            _ => throw new BadRequestException($"Invalid expiresIn unit '{unit}'. Use s/m/h/d.")
        };
    }
}
