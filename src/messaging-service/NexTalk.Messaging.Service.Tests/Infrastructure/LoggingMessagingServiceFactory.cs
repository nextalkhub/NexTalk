using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Extensions.Logging;

namespace NexTalk.Messaging.Service.Tests.Infrastructure;

/// <summary>
/// Расширение <see cref="MessagingServiceFactory"/> с перехватом Serilog-логов через <see cref="TestLogSink"/>.
/// Заменяет ILoggerFactory на SerilogLoggerFactory, пишущую в тест-синк.
/// </summary>
public sealed class LoggingMessagingServiceFactory : MessagingServiceFactory
{
    public TestLogSink LogSink { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureTestServices(services =>
        {
            // Убираем зарегистрированный Serilog ILoggerFactory из Program.cs
            var existing = services
                .Where(d => d.ServiceType == typeof(ILoggerFactory))
                .ToList();
            foreach (var d in existing) services.Remove(d);

            var testLogger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.Sink(LogSink)
                .CreateLogger();

            services.AddSingleton<ILoggerFactory>(_ => new SerilogLoggerFactory(testLogger, dispose: true));
        });
    }
}
