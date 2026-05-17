using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Features.Messages.GetMessages;

public class GetMessagesHandler(MessagingDbContext db, IGuildServiceClient guildClient)
{
    public async Task<GetMessagesResponse> HandleAsync(GetMessagesQuery query, CancellationToken ct = default)
    {
        // Flow 11 step 5-6: ask Guild Service whether this user can see the channel.
        var access = await guildClient.CheckChannelAccessAsync(query.ChannelId, query.UserId, ct);
        if (access.GuildId is null)
            throw new NotFoundException("Channel not found.");
        if (!access.Allowed)
            throw new ForbiddenException("You do not have access to this channel.");

        // Cursor pagination keyed by message Id (UUIDv7 expected for monotonic ordering).
        // Fetch limit+1 to detect whether more history exists without an extra COUNT query.
        var q = db.Messages.AsNoTracking()
            .Where(m => m.ChannelId == query.ChannelId);

        if (query.Cursor is { } cursor)
        {
            var cursorCreatedAt = await db.Messages
                .Where(m => m.Id == cursor)
                .Select(m => (DateTime?)m.CreatedAt)
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
