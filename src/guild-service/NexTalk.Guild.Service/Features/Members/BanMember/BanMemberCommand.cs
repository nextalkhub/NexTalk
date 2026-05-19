namespace NexTalk.Guild.Service.Features.Members.BanMember;

public record BanMemberCommand(Guid GuildId, string TargetUserId, string CallerId);
