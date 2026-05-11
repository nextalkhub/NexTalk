using NexTalk.Guild.Service.Features.Invites.AcceptInvite;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public class FakeInviteRepository(bool claimSucceeds = true) : IInviteRepository
{
    public Task<bool> TryClaimAsync(Guid inviteId, CancellationToken ct = default) =>
        Task.FromResult(claimSucceeds);
}
