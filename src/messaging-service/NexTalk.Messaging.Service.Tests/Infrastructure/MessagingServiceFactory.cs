using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using System.Net.Http;

namespace NexTalk.Messaging.Service.Tests.Infrastructure;

public class MessagingServiceFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder
            .UseEnvironment("Test")
            .ConfigureAppConfiguration((ctx, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:PostgresConnection"] = "test",
                    ["WsGateway:BaseUrl"] = "http://localhost:5001",
                    ["GuildService:BaseUrl"] = "http://localhost:5000"
                });
            })
            .ConfigureTestServices(services =>
            {
                var dbContextDescriptors = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<MessagingDbContext>) ||
                    d.ServiceType.Name.Contains("DbContextOptions")).ToList();
                foreach (var d in dbContextDescriptors)
                    services.Remove(d);

                services.AddDbContext<MessagingDbContext>(opts =>
                    opts.UseInMemoryDatabase(_dbName), ServiceLifetime.Scoped);

                var wsGatewayDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(WsGatewayClient));
                if (wsGatewayDescriptor is not null)
                    services.Remove(wsGatewayDescriptor);

                var mockHttpClient = new HttpClient(new MockHttpMessageHandler());
                services.AddSingleton(new WsGatewayClient(mockHttpClient));

                var guildServiceDescriptor = services.FirstOrDefault(d => d.ServiceType == typeof(GuildServiceClient));
                if (guildServiceDescriptor is not null)
                    services.Remove(guildServiceDescriptor);

                var guildServiceMock = new GuildServiceClient(mockHttpClient);
                services.AddSingleton(guildServiceMock);
            });
    }

    public async Task<MessagingDbContext> GetDbContextAsync()
    {
        var scope = Services.CreateAsyncScope();
        return scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
    }

    public HttpClient CreateAuthenticatedClient(Guid userId)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", userId.ToString());
        return client;
    }
}

public class MockHttpMessageHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.OK });
    }
}
