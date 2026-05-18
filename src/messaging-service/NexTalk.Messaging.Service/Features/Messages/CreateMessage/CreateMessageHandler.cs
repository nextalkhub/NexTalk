using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.CreateMessage;

public sealed class CreateMessageHandler
{
    private readonly MessagingDbContext _db;
    private readonly ILogger<CreateMessageHandler> _logger;

    private static readonly TimeSpan IdempotencyTtl = TimeSpan.FromHours(24);

    public CreateMessageHandler(MessagingDbContext db, ILogger<CreateMessageHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<CreateMessageResult> HandleAsync(CreateMessageCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Content))
            throw new BadRequestException("Message content cannot be empty.");

        var cached = await _db.IdempotencyKeys
            .FirstOrDefaultAsync(k => k.Key == cmd.IdempotencyKey && k.ExpiresAt > DateTimeOffset.UtcNow, ct);

        if (cached is not null)
        {
            _logger.LogInformation(
                "Idempotency hit: key={Key} correlation={CorrelationId}",
                cmd.IdempotencyKey, cmd.CorrelationId);

            var cachedDto = JsonSerializer.Deserialize<MessageDto>(cached.Response)!;
            return new CreateMessageResult(cachedDto, IsReplay: true);
        }

        var message = new Message
        {
            ChannelId = cmd.ChannelId,
            GuildId = cmd.GuildId,
            AuthorId = cmd.AuthorId,
            AuthorName = cmd.AuthorName,
            Content = cmd.Content,
        };

        var dto = ToDto(message);
        var outbox = new OutboxEvent
        {
            EventType = "message.created",
            GuildId = cmd.GuildId,
            Payload = JsonSerializer.Serialize(dto),
        };
        var idempotencyKey = new IdempotencyKey
        {
            Key = cmd.IdempotencyKey,
            Response = JsonSerializer.Serialize(dto),
            ExpiresAt = DateTimeOffset.UtcNow.Add(IdempotencyTtl),
        };

        // Три вставки в одной транзакции
        _db.Messages.Add(message);
        _db.OutboxEvents.Add(outbox);
        _db.IdempotencyKeys.Add(idempotencyKey);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Message created: id={MessageId} channel={ChannelId} guild={GuildId} correlation={CorrelationId}",
            message.Id, cmd.ChannelId, cmd.GuildId, cmd.CorrelationId);

        return new CreateMessageResult(dto, IsReplay: false);
    }

    public static MessageDto ToDto(Message m) =>
        new(m.Id, m.ChannelId, m.GuildId, m.AuthorId, m.AuthorName, m.Content, m.CreatedAt);
}

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    Guid GuildId,
    string AuthorId,
    string AuthorName,
    string Content,
    DateTimeOffset CreatedAt);

public record CreateMessageResult(MessageDto Message, bool IsReplay);
