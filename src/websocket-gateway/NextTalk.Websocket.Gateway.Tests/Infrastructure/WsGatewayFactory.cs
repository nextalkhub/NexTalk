using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

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
            // Подменяем discovery doc и валидацию JWT, чтобы не лезть по сети.
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
        });
    }

    public HttpClient CreateAuthenticatedClient(Guid userId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId));
        return client;
    }
}
