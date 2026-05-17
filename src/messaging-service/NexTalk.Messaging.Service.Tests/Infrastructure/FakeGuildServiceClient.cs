using NexTalk.Messaging.Service.Shared;

namespace NexTalk.Messaging.Service.Tests.Infrastructure;

public class FakeGuildServiceClient(ChannelAccessResult result, bool adminCheckGranted = true) : IGuildServiceClient
{
    public int CallCount { get; private set; }
    public Guid? LastChannelId { get; private set; }
    public Guid? LastUserId { get; private set; }

    public Task<ChannelAccessResult> CheckChannelAccessAsync(Guid channelId, Guid userId, CancellationToken ct = default)
    {
        CallCount++;
        LastChannelId = channelId;
        LastUserId = userId;
        return Task.FromResult(result);
    }

    public Task RequireAdminOrOwnerAsync(Guid channelId, Guid userId, CancellationToken ct = default)
    {
        if (!adminCheckGranted)
            throw new NexTalk.Messaging.Service.Shared.Exceptions.ForbiddenException("Only Admin or Owner can delete messages of other users.");
        return Task.CompletedTask;
    }
}
