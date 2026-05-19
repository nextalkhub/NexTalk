using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NexTalk.Guild.Service.Domain;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using NexTalk.Guild.Service.Shared.Exceptions;

namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public class CreateInviteHandler
{
    private readonly GuildDbContext _db;
    private readonly RbacService _rbac;
    private readonly IConfiguration _config;

    public CreateInviteHandler(GuildDbContext db, RbacService rbac, IConfiguration config)
    {
        _db = db;
        _rbac = rbac;
        _config = config;
    }

    /// <summary>Созданное приглашение.</summary>
    /// <param name="Id">Идентификатор приглашения (UUIDv7).</param>
    /// <param name="Code">Публичный код (12 символов base64url) — часть ссылки после /invite/.</param>
    /// <param name="Url">Полная ссылка-приглашение для отправки пользователю.</param>
    /// <param name="GuildId">Идентификатор гильдии, в которую ведет приглашение.</param>
    /// <param name="ExpiresAt">Срок действия. Null — бессрочное.</param>
    /// <param name="MaxUses">Лимит активаций. Null — без лимита.</param>
    /// <param name="UsesCount">Текущее число активаций.</param>
    /// <param name="CreatedAt">Дата и время создания (UTC).</param>
    public record InviteResponse(
        Guid Id,
        string Code,
        string Url,
        Guid GuildId,
        DateTimeOffset? ExpiresAt,
        int? MaxUses,
        int UsesCount,
        DateTimeOffset CreatedAt);

    public async Task<InviteResponse> HandleAsync(CreateInviteCommand cmd, CancellationToken ct = default)
    {
        if (cmd.MaxUses.HasValue && cmd.MaxUses.Value <= 0)
            throw new BadRequestException("maxUses must be a positive integer.");

        if (!await _db.Guilds.AnyAsync(g => g.Id == cmd.GuildId, ct))
            throw new NotFoundException("Guild not found.");

        await _rbac.RequireAdminOrOwnerAsync(cmd.GuildId, cmd.CallerId, ct);

        var code = GenerateSecureCode();
        var invite = new Invite
        {
            Id = Guid.CreateVersion7(),
            GuildId = cmd.GuildId,
            Code = code,
            CreatedBy = cmd.CallerId,
            ExpiresAt = cmd.ExpiresIn.HasValue ? DateTimeOffset.UtcNow.Add(cmd.ExpiresIn.Value) : null,
            MaxUses = cmd.MaxUses,
            UsesCount = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.Invites.Add(invite);
        await _db.SaveChangesAsync(ct);

        var baseUrl = _config["Invites:BaseUrl"] ?? "https://nextalk.fun/invite";
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
