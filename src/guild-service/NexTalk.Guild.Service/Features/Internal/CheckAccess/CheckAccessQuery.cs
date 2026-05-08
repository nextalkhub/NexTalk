using NexTalk.Guild.Service.Domain;

namespace NexTalk.Guild.Service.Features.Internal.CheckAccess;

public record CheckAccessQuery(Guid GuildId, Guid UserId, MemberRole RequiredRole);
