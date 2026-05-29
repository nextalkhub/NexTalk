using Serilog.Core;
using Serilog.Events;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public sealed class TestLogSink : ILogEventSink
{
    private readonly List<LogEvent> _events = new();

    public IReadOnlyList<LogEvent> Events
    {
        get { lock (_events) return _events.ToList(); }
    }

    public void Emit(LogEvent logEvent)
    {
        lock (_events) _events.Add(logEvent);
    }

    public bool HasMessageTemplate(string substring) =>
        Events.Any(e => e.MessageTemplate.Text.Contains(substring));

    public bool HasPropertyValue(string name, string value) =>
        Events.Any(e =>
            e.Properties.TryGetValue(name, out var prop) &&
            prop.ToString().Contains(value, StringComparison.OrdinalIgnoreCase));

    public bool HasLevel(LogEventLevel level, string messageSubstring) =>
        Events.Any(e => e.Level == level && e.MessageTemplate.Text.Contains(messageSubstring));
}
