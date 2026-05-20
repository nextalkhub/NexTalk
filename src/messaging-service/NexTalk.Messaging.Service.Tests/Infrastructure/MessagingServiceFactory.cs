using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Infrastructure.Outbox;
using NexTalk.Messaging.Service.Shared;
using System.Net.Http.Headers;
using System.Text;

namespace NexTalk.Messaging.Service.Tests.Infrastructure;

public class MessagingServiceFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();
    private readonly InMemoryDatabaseRoot _dbRoot = new();

    public ChannelAccessResult GuildAccessResponse { get; set; } =
        new(true, Guid.NewGuid());

    public bool AdminCheckGranted { get; set; } = true;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:PostgresConnection", "Host=placeholder;Database=placeholder");
        builder.UseSetting("Zitadel:Authority", "http://test-authority");
        builder.UseSetting("Zitadel:MetadataAddress", "http://test-authority/.well-known/openid-configuration");
        builder.UseSetting("Services:GuildService", "http://test-guild-service");
        builder.UseSetting("Services:WebSocketGateway", "http://test-ws-gateway");

        builder.ConfigureTestServices(services =>
        {
            var zitadelEnricher = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IClaimsTransformation)
                && d.ImplementationType == typeof(ZitadelClaimsEnricher));
            if (zitadelEnricher is not null)
                services.Remove(zitadelEnricher);

            var backgroundServices = services
                .Where(d => d.ServiceType == typeof(IHostedService) &&
                            (d.ImplementationType == typeof(OutboxWorker) ||
                             d.ImplementationType == typeof(BroadcastConsumer)))
                .ToList();
            foreach (var d in backgroundServices) services.Remove(d);

            var dbDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<MessagingDbContext>) ||
                    d.ServiceType == typeof(MessagingDbContext) ||
                    (d.ServiceType.IsGenericType &&
                     d.ServiceType.GenericTypeArguments.Length > 0 &&
                     d.ServiceType.GenericTypeArguments[0] == typeof(MessagingDbContext)))
                .ToList();
            foreach (var d in dbDescriptors) services.Remove(d);

            services.AddDbContext<MessagingDbContext>(opts =>
                opts.UseInMemoryDatabase(_dbName, _dbRoot));

            var clientDescriptors = services
                .Where(d => d.ServiceType == typeof(IGuildServiceClient))
                .ToList();
            foreach (var d in clientDescriptors) services.Remove(d);
            services.AddScoped<IGuildServiceClient>(_ => new FakeGuildServiceClient(GuildAccessResponse, AdminCheckGranted));

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwt.SigningKey));
            services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, opts =>
            {
                opts.Authority = null!;
                opts.MetadataAddress = null!;
                opts.RequireHttpsMetadata = false;
                opts.MapInboundClaims = false;
                opts.UseSecurityTokenValidators = true;
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

    public async Task<MessagingDbContext> GetDbContextAsync()
    {
        var scope = Services.CreateAsyncScope();
        return scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
    }

    public HttpClient CreateAuthenticatedClient(string userId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId));
        return client;
    }
}
