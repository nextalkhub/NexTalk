using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Guild.Service.Infrastructure;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public class GuildServiceFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly InMemoryDatabaseRoot _dbRoot = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Applied BEFORE WebApplication.CreateBuilder reads its Configuration,
        // so connection strings have non-null placeholders by the time Program.cs
        // calls AddNpgSql / AddRedis (which throw on null).
        builder.UseSetting("ConnectionStrings:PostgresConnection", "Host=placeholder;Database=placeholder");
        builder.UseSetting("ConnectionStrings:Redis", "placeholder");
        builder.UseSetting("WsGateway:BaseUrl", "http://localhost:19999");
        builder.UseSetting("VoiceService:BaseUrl", "http://localhost:19998");
        builder.UseSetting("Invites:BaseUrl", "https://test.local/invite");

        builder.ConfigureTestServices(services =>
        {
            // Replace Npgsql with InMemory EF Core. Must strip ALL GuildDbContext-related
            // generic descriptors (incl. IDbContextOptionsConfiguration<GuildDbContext>)
            // to avoid the dual-provider exception.
            var dbDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<GuildDbContext>) ||
                    d.ServiceType == typeof(GuildDbContext) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GenericTypeArguments.Length > 0 &&
                     d.ServiceType.GenericTypeArguments[0] == typeof(GuildDbContext)))
                .ToList();
            foreach (var d in dbDescriptors) services.Remove(d);

            services.AddDbContext<GuildDbContext>(opts =>
                opts.UseInMemoryDatabase(_dbName, _dbRoot));

            // Replace Redis distributed cache with in-memory.
            var cacheDescriptors = services
                .Where(d => d.ServiceType == typeof(IDistributedCache))
                .ToList();
            foreach (var d in cacheDescriptors) services.Remove(d);
            services.AddSingleton<IDistributedCache, MemoryDistributedCache>();
            services.AddSingleton<IMemoryCache, MemoryCache>();
        });
    }
}
