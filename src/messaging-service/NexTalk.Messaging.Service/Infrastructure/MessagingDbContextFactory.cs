using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace NexTalk.Messaging.Service.Infrastructure;

// Используется только инструментами EF Core (dotnet ef migrations add / update).
public sealed class MessagingDbContextFactory : IDesignTimeDbContextFactory<MessagingDbContext>
{
    public MessagingDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<MessagingDbContext>()
            .UseNpgsql("Host=localhost;Database=nextalk;Username=postgres;Password=postgres")
            .Options;
        return new MessagingDbContext(opts);
    }
}
