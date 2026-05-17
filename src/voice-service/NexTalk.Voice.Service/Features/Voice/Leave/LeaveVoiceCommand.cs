namespace NexTalk.Voice.Service.Features.Voice.Leave;

public record LeaveVoiceCommand(
    Guid ChannelId,
    Guid UserId,
    string CorrelationId);
