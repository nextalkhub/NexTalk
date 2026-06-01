namespace NexTalk.Voice.Service.Infrastructure;

public interface ISessionStore
{
    void Join(string userId, Guid channelId, Guid guildId);
    VoiceSession? Leave(string userId);
    VoiceSession? GetSession(string userId);
    IReadOnlyList<string> GetParticipants(Guid channelId);
    IReadOnlyList<(string UserId, VoiceSession Session)> ClearChannel(Guid channelId);
}
