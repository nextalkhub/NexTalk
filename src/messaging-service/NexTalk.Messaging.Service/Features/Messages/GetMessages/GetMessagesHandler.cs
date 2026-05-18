using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public class GetMessagesHandler
{
    private readonly MessagingDbContext _db;
    private readonly IGuildServiceClient _guildClient;

    public GetMessagesHandler(MessagingDbContext db, IGuildServiceClient guildClient)
    {
        _db = db;
        _guildClient = guildClient;
    }

    public async Task<GetMessagesResponse> HandleAsync(GetMessagesQuery query, CancellationToken ct = default)
    {
        var access = await _guildClient.CheckChannelAccessAsync(query.ChannelId, query.UserId, ct);
        if (access.GuildId is null)
            throw new NotFoundException("Channel not found.");
        if (!access.Allowed)
            throw new ForbiddenException("You do not have access to this channel.");
        
        var q = _db.Messages.AsNoTracking()
            .Where(m => m.ChannelId == query.ChannelId);

        if (query.Cursor is { } cursor)
        {
            var cursorCreatedAt = await _db.Messages
                .Where(m => m.Id == cursor)
                .Select(m => (DateTimeOffset ?)m.CreatedAt)
                .FirstOrDefaultAsync(ct);

            if (cursorCreatedAt is not null)
                q = q.Where(m => m.CreatedAt < cursorCreatedAt.Value
                                 || (m.CreatedAt == cursorCreatedAt.Value && m.Id != cursor && m.Id.CompareTo(cursor) < 0));
        }

        var rows = await q
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id)
            .Take(query.Limit + 1)
            .Select(m => new MessageDto(m.Id, m.ChannelId, m.AuthorId, m.AuthorName, m.Content, m.CreatedAt))
            .ToListAsync(ct);

        Guid? nextCursor = null;
        if (rows.Count > query.Limit)
        {
            rows.RemoveAt(rows.Count - 1);
            nextCursor = rows[^1].Id;
        }

        return new GetMessagesResponse(rows, nextCursor);
    }
}
