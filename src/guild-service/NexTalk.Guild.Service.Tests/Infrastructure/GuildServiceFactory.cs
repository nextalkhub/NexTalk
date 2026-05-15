using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NexTalk.Guild.Service.Infrastructure;
using NexTalk.Guild.Service.Shared;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Net.Http;

namespace NexTalk.Guild.Service.Tests.Infrastructure;

public class GuildServiceFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder
            .UseEnvironment("Test")
            .ConfigureAppConfiguration((ctx, config) =>
            {
                // Override connection strings for test environment
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:PostgresConnection"] = "test",
                    ["ConnectionStrings:Redis"] = "localhost:6379",
                    ["WsGateway:BaseUrl"] = "http://localhost:5001",
                    ["VoiceService:BaseUrl"] = "http://localhost:5002"
                });
            })
            .ConfigureTestServices(services =>
            {
                // Remove all DbContextOptions to ensure clean state
                var dbContextDescriptors = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<GuildDbContext>) ||
                    d.ServiceType.Name.Contains("DbContextOptions")).ToList();
                foreach (var d in dbContextDescriptors)
                    services.Remove(d);

                // Remove cache services to avoid Redis connection issues
                var cacheDescriptors = services.Where(d =>
                    d.ServiceType == typeof(IDistributedCache) ||
                    d.ServiceType.Name.Contains("Cache")).ToList();
                foreach (var d in cacheDescriptors)
                    services.Remove(d);

                // Add empty health checks service to satisfy Program.cs
                if (!services.Any(d => d.ServiceType.Name.Contains("HealthCheckService")))
                {
                    services.AddHealthChecks();
                }

                // Add InMemory database with named instance to persist data across requests
                services.AddDbContext<GuildDbContext>(opts =>
                    opts.UseInMemoryDatabase(_dbName), ServiceLifetime.Scoped);

                // Add a null implementation of IDistributedCache
                services.AddSingleton<IDistributedCache>(new NullDistributedCache());

                // Configure JWT authentication for tests
                var jwtDescriptor = services.FirstOrDefault(d =>
                    d.ServiceType == typeof(IConfigureOptions<JwtBearerOptions>));
                if (jwtDescriptor is not null)
                    services.Remove(jwtDescriptor);

                services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, opts =>
                {
                    opts.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = false,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = false,
                        IssuerSigningKey = new SymmetricSecurityKey("test-secret-key-that-is-long-enough"u8.ToArray())
                    };
                    opts.MapInboundClaims = false;
                    opts.UseSecurityTokenValidators = true;
                });

                // Replace WsGatewayClient with mock
                var wsGatewayDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(WsGatewayClient));
                if (wsGatewayDescriptor is not null)
                    services.Remove(wsGatewayDescriptor);

                var mockHttpClient = new HttpClient(new MockHttpMessageHandler());
                services.AddSingleton(new WsGatewayClient(mockHttpClient));
            });
    }

    public async Task<GuildDbContext> GetDbContextAsync()
    {
        var scope = Services.CreateAsyncScope();
        return scope.ServiceProvider.GetRequiredService<GuildDbContext>();
    }

    public HttpClient CreateAuthenticatedClient(Guid userId)
    {
        var client = CreateClient();
        var token = GenerateToken(userId);
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.Add("X-User-Id", userId.ToString());
        return client;
    }

    private string GenerateToken(Guid userId)
    {
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey("test-secret-key-that-is-long-enough"u8.ToArray());
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "test",
            audience: "test",
            claims: new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, userId.ToString()),
                new("name", "Test User"),
                new("preferred_username", "testuser")
            },
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        return handler.WriteToken(token);
    }
}

public class MockHttpMessageHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.OK });
    }
}

public class NullDistributedCache : IDistributedCache
{
    public byte[]? Get(string key) => null;
    public Task<byte[]?> GetAsync(string key, CancellationToken token = default) => Task.FromResult<byte[]?>(null);
    public void Set(string key, byte[] value, DistributedCacheEntryOptions options) { }
    public Task SetAsync(string key, byte[] value, DistributedCacheEntryOptions options, CancellationToken token = default) => Task.CompletedTask;
    public void Refresh(string key) { }
    public Task RefreshAsync(string key, CancellationToken token = default) => Task.CompletedTask;
    public void Remove(string key) { }
    public Task RemoveAsync(string key, CancellationToken token = default) => Task.CompletedTask;
}
