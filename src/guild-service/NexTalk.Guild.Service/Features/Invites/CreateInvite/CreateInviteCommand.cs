namespace NexTalk.Guild.Service.Features.Invites.CreateInvite;

public record CreateInviteCommand(Guid GuildId, TimeSpan? ExpiresIn, int? MaxUses, Guid CallerId);
