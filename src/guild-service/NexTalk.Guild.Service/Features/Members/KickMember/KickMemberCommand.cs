namespace NexTalk.Guild.Service.Features.Members.KickMember;

public record KickMemberCommand(Guid GuildId, Guid TargetUserId, Guid CallerId);
