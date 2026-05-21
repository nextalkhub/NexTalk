using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using NextTalk.Websocket.Gateway.Shared;

namespace NextTalk.Websocket.Gateway.Tests.Infrastructure;

public class WsGatewayFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration(config =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Zitadel:Authority"] = "http://test-authority",
                ["Zitadel:MetadataAddress"] = "http://test-authority/.well-known/openid-configuration",
                ["Services:GuildService"] = "http://localhost:19997",
                ["Services:MessagingService"] = "http://localhost:19996",
            }));

        builder.ConfigureTestServices(services =>
        {
            var zitadelEnricher = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IClaimsTransformation)
                && d.ImplementationType == typeof(ZitadelClaimsEnricher));
            if (zitadelEnricher is not null)
                services.Remove(zitadelEnricher);

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
                    IssuerSigningKey = signingKey,
                };
                opts.BackchannelHttpHandler = null;
            });

            // Заменяем Redis-реализации на in-memory — Redis недоступен в тестовом окружении.
            services.RemoveAll<IConnectionManager>();
            services.RemoveAll<IPresenceTracker>();
            services.AddSingleton<IConnectionManager, ConnectionManager>();
            services.AddSingleton<IPresenceTracker, PresenceTracker>();

            // Заменяем ZitadelClaimsEnricher на no-op — в тестах нет Zitadel,
            // HTTP-вызов к userinfo завис бы на DNS-таймауте (30+ с).
            services.RemoveAll<IClaimsTransformation>();
            services.AddTransient<IClaimsTransformation, PassThroughClaimsTransformation>();

            // Снимаем Redis SignalR backplane, оставляем только дефолтный in-memory lifetime manager.
            // AddStackExchangeRedis в Program.cs добавил RedisHubLifetimeManager<>; убираем все
            // регистрации HubLifetimeManager<> и регистрируем только DefaultHubLifetimeManager<>.
            var redisHubDescriptors = services
                .Where(d => d.ServiceType == typeof(HubLifetimeManager<>))
                .ToList();
            foreach (var d in redisHubDescriptors)
                services.Remove(d);
            services.AddSingleton(typeof(HubLifetimeManager<>), typeof(DefaultHubLifetimeManager<>));
        });
    }

    public HttpClient CreateAuthenticatedClient(string userId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId));
        return client;
    }
}

file sealed class PassThroughClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal) =>
        Task.FromResult(principal);
}
