using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using NexTalk.Guild.Service.Features.Invites.AcceptInvite;
using NexTalk.Guild.Service.Infrastructure;
using System.Text;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public class GuildServiceFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Provide config values so Program.cs null-assertions don't throw
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
            }));

        builder.ConfigureTestServices(services =>
        {
            // Replace PostgreSQL with InMemory EF Core
            var dbDescriptors = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<GuildDbContext>))
                .ToList();
            foreach (var d in dbDescriptors) services.Remove(d);
            services.AddDbContext<GuildDbContext>(opts =>
                opts.UseInMemoryDatabase(Guid.NewGuid().ToString()));

            // Replace Redis with in-memory distributed cache
            var cacheDescriptors = services
                .Where(d => d.ServiceType == typeof(IDistributedCache))
                .ToList();
            foreach (var d in cacheDescriptors) services.Remove(d);
            services.AddSingleton<IDistributedCache, MemoryDistributedCache>();
            services.AddSingleton<IMemoryCache, MemoryCache>();

            // Replace raw-SQL InviteRepository with a fake that always succeeds
            var inviteRepoDescriptors = services
                .Where(d => d.ServiceType == typeof(IInviteRepository))
                .ToList();
            foreach (var d in inviteRepoDescriptors) services.Remove(d);
            services.AddScoped<IInviteRepository>(_ => new FakeInviteRepository(claimSucceeds: true));

            // Override JWT validation: use a known symmetric key, bypass OIDC metadata fetch
            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwt.SigningKey));
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, opts =>
            {
                // Setting Configuration directly prevents the middleware from calling MetadataAddress
                opts.Configuration = new OpenIdConnectConfiguration
                {
                    SigningKeys = { signingKey }
                };
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
}
