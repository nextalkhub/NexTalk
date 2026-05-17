namespace NexTalk.Voice.Service.Features.Voice.Join;

public record JoinVoiceCommand(
    Guid ChannelId,
    Guid UserId,
    string DisplayName,
    string CorrelationId);
