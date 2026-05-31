using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using NexTalk.Guild.Service.Features.Invites.AcceptInvite;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
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
            var zitadelEnricher = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IClaimsTransformation)
                && d.ImplementationType == typeof(ZitadelClaimsEnricher));
            if (zitadelEnricher is not null)
                services.Remove(zitadelEnricher);

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

            services.AddSingleton<IMemoryCache, MemoryCache>();

            var inviteRepoDescriptors = services
                .Where(d => d.ServiceType == typeof(IInviteRepository))
                .ToList();
            foreach (var d in inviteRepoDescriptors) services.Remove(d);
            services.AddScoped<IInviteRepository>(_ => new FakeInviteRepository(claimSucceeds: true));

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
