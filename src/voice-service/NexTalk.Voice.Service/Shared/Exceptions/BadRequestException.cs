namespace NexTalk.Voice.Service.Shared.Exceptions;

public sealed class BadRequestException(string message) : Exception(message);
