using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Features.Members.AssignRole;

public record AssignRoleCommand(Guid GuildId, Guid TargetUserId, MemberRole Role, Guid CallerId);
