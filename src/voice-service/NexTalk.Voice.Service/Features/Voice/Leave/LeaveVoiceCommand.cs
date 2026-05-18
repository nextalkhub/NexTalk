namespace NexTalk.Voice.Service.Features.Voice.Leave;

public record LeaveVoiceCommand(
    Guid ChannelId,
    string UserId,
    string CorrelationId);
