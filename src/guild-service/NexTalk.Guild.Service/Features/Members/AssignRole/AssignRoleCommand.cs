using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public record AssignRoleCommand(Guid GuildId, string TargetUserId, MemberRole Role, string CallerId);
