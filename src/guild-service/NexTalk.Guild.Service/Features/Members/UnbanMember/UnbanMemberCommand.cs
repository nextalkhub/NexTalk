namespace NexTalk.Guild.Service.Features.Members.UnbanMember;

public record UnbanMemberCommand(Guid GuildId, string TargetUserId, string CallerId);
