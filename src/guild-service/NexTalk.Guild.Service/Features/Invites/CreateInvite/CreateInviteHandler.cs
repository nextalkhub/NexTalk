using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public class CreateInviteHandler(GuildDbContext db, RbacService rbac, IConfiguration config)
{
    public record InviteResponse(
        Guid Id,
        string Code,
        string Url,
        Guid GuildId,
        DateTime? ExpiresAt,
        int? MaxUses,
        int UsesCount,
        DateTime CreatedAt);

    public async Task<InviteResponse> HandleAsync(CreateInviteCommand cmd, CancellationToken ct = default)
    {
        if (!await db.Guilds.AnyAsync(g => g.Id == cmd.GuildId, ct))
            throw new NotFoundException("Guild not found.");

        await rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var code = GenerateSecureCode();
        var invite = new Invite
        {
            Id = Guid.NewGuid(),
            GuildId = cmd.GuildId,
            Code = code,
            CreatedBy = cmd.CallerId,
            ExpiresAt = cmd.ExpiresIn.HasValue ? DateTime.UtcNow.Add(cmd.ExpiresIn.Value) : null,
            MaxUses = cmd.MaxUses,
            UsesCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        db.Invites.Add(invite);
        await db.SaveChangesAsync(ct);

        var baseUrl = config["Invites:BaseUrl"] ?? "https://nextalk.app/invite";
        var url = $"{baseUrl.TrimEnd('/')}/{invite.Code}";

        return new InviteResponse(
            invite.Id, invite.Code, url, invite.GuildId,
            invite.ExpiresAt, invite.MaxUses, invite.UsesCount, invite.CreatedAt);
    }

    // 9 bytes → 12-character base64url (no padding) → ~72 bits of entropy.
    // RandomNumberGenerator is the CSPRNG required by spec ("криптографически случайный").
    // Base64url over hex doubles density per char and stays URL-safe without encoding.
    private static string GenerateSecureCode()
    {
        Span<byte> bytes = stackalloc byte[9];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}
