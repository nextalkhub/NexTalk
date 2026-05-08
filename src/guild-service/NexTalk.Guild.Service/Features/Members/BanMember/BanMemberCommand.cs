namespace NexTalk.Guild.Service.Features.Members.BanMember;

public record BanMemberCommand(Guid GuildId, Guid TargetUserId, Guid CallerId);
