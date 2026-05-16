using NexTalk.Messaging.Service.Shared.Exceptions;

namespace NexTalk.Messaging.Service.Shared;

public class GuildServiceClient(HttpClient http)
{
    public record AccessResult(bool HasAccess, string? Role);

    public virtual async Task RequireAdminOrOwnerAsync(Guid guildId, Guid userId, CancellationToken ct = default)
    {
        try
        {
            var response = await http.GetAsync(
                $"/internal/guilds/{guildId}/access?userId={userId}&requiredRole=Admin", ct);

            if (!response.IsSuccessStatusCode)
                throw new ForbiddenException("User does not have required access level.");
        }
        catch (HttpRequestException)
        {
            throw new ForbiddenException("Unable to verify user access.");
        }
    }
}
