namespace NexTalk.Guild.Service.Features.Invites.AcceptInvite;

public interface IInviteRepository
{
    Task<bool> TryClaimAsync(Guid inviteId, CancellationToken ct = default);
}
