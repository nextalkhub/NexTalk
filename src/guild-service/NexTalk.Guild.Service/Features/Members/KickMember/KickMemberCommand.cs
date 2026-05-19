namespace NexTalk.Guild.Service.Features.Members.KickMember;

public record KickMemberCommand(Guid GuildId, string TargetUserId, string CallerId);
