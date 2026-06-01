using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Serilog.Extensions.Logging;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public sealed class LoggingGuildServiceFactory : GuildServiceFactory
{
    public TestLogSink LogSink { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);

        builder.ConfigureTestServices(services =>
        {
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
