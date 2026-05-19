namespace NexTalk.Voice.Service.Features.Voice.Join;

public record JoinVoiceCommand(
    Guid ChannelId,
    string UserId,
    string DisplayName,
    string CorrelationId);
