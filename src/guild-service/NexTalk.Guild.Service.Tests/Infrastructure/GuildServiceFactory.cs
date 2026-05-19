using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using NexTalk.Guild.Service.Features.Invites.AcceptInvite;
using NexTalk.Guild.Service.Infrastructure;
using System.Net.Http.Headers;
using System.Text;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public class GuildServiceFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration(config =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:PostgresConnection"] = "placeholder",
                ["ConnectionStrings:Redis"] = "placeholder",
                ["Zitadel:Authority"] = "http://test-authority",
                ["Zitadel:MetadataAddress"] = "http://test-authority/.well-known/openid-configuration",
                ["WsGateway:BaseUrl"] = "http://localhost:19999",
                ["VoiceService:BaseUrl"] = "http://localhost:19998",
                ["Services:WebSocketGateway"] = "http://localhost:19999",
                ["Services:VoiceService"] = "http://localhost:19998",
                ["Invites:BaseUrl"] = "https://test.local/invite",
            }));

        builder.ConfigureTestServices(services =>
        {
            // Заменяем PostgreSQL на InMemory EF Core.
            // Удаляем и DbContextOptions, и сам GuildDbContext, затем регистрируем опции напрямую
            // как синглтон - в обход механизма AddDbContext и Npgsql-конфигурации, которая
            // вызывала конфликт двух провайдеров. Фиксированное имя БД гарантирует, что все
            // DI-скоупы работают с одним и тем же InMemory-хранилищем.
            var dbDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<GuildDbContext>) ||
                    d.ServiceType == typeof(GuildDbContext))
                .ToList();
            foreach (var d in dbDescriptors) services.Remove(d);

            var dbName = Guid.NewGuid().ToString();
            services.AddSingleton(new DbContextOptionsBuilder<GuildDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options);
            services.AddScoped<GuildDbContext>();

            // Заменяем Redis на in-memory distributed cache
            var cacheDescriptors = services
                .Where(d => d.ServiceType == typeof(IDistributedCache))
                .ToList();
            foreach (var d in cacheDescriptors) services.Remove(d);
            services.AddSingleton<IDistributedCache, MemoryDistributedCache>();
            services.AddSingleton<IMemoryCache, MemoryCache>();

            // Заменяем SQL-реализацию InviteRepository фейковой, которая всегда возвращает успех
            var inviteRepoDescriptors = services
                .Where(d => d.ServiceType == typeof(IInviteRepository))
                .ToList();
            foreach (var d in inviteRepoDescriptors) services.Remove(d);
            services.AddScoped<IInviteRepository>(_ => new FakeInviteRepository(claimSucceeds: true));

            // Переопределяем валидацию JWT известным симметричным ключом.
            // Системный JwtBearerPostConfigureOptions выполняется до этого коллбэка и создает
            // настоящий ConfigurationManager из MetadataAddress. Мы заменяем его на
            // StaticConfigurationManager - иначе хэндлер пытается обратиться по сети к http://test-authority.
            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwt.SigningKey));
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, opts =>
            {
                var oidcConfig = new OpenIdConnectConfiguration { SigningKeys = { signingKey } };
                opts.Configuration = oidcConfig;
                opts.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(oidcConfig);
                opts.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = false,
                    IssuerSigningKey = signingKey
                };
            });
        });
    }

    public async Task<GuildDbContext> GetDbContextAsync()
    {
        var scope = Services.CreateAsyncScope();
        return scope.ServiceProvider.GetRequiredService<GuildDbContext>();
    }

    public HttpClient CreateAuthenticatedClient(string userId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId));
        return client;
    }
}
