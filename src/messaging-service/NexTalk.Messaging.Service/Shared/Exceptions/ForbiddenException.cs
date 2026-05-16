namespace NexTalk.Messaging.Service.Shared.Exceptions;

public sealed class ForbiddenException(string message) : Exception(message);
