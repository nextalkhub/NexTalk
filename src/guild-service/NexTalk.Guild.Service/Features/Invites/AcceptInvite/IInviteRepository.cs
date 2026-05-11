namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public interface IInviteRepository
{
    // Atomically increments uses_count. Returns false if invite is expired or max uses reached.
    Task<bool> TryClaimAsync(Guid inviteId, CancellationToken ct = default);
}
