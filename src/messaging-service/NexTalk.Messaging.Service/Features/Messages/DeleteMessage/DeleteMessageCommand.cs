namespace NexTalk.Messaging.Service.Features.Messages.DeleteMessage;

public record DeleteMessageCommand(Guid MessageId, Guid CallerId);
