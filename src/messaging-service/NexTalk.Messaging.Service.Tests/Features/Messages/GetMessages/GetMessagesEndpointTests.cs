using Microsoft.Extensions.DependencyInjection;
using NexTalk.Messaging.Service.Domain;
using NexTalk.Messaging.Service.Features.Messages.GetMessages;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.Features.Messages.GetMessages;

public class GetMessagesEndpointTests(MessagingServiceFactory factory) : IClassFixture<MessagingServiceFactory>
{
    private HttpClient NewClient() => factory.CreateClient();

    private static void Authorize(HttpClient client, string userId) =>
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwt.Generate(userId));

    private async Task SeedAsync(Guid channelId, int count, DateTimeOffset? baseTime = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
        var start = baseTime ?? DateTimeOffset.UtcNow.AddMinutes(-count);
        for (var i = 0; i < count; i++)
        {
            db.Messages.Add(new Message
            {
                Id = Guid.NewGuid(),
                ChannelId = channelId,
                GuildId = Guid.NewGuid(),
                AuthorId = Guid.NewGuid().ToString(),
                AuthorName = $"User{i}",
                Content = $"msg{i}",
                CreatedAt = start.AddSeconds(i)
            });
        }
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetMessages_WithoutToken_Returns401()
    {
        var response = await NewClient().GetAsync($"/channels/{Guid.NewGuid()}/messages");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMessages_WhenChannelDoesNotExist_Returns404()
    {
        factory.GuildAccessResponse = new ChannelAccessResult(false, null);
        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/channels/{Guid.NewGuid()}/messages");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetMessages_WhenUserHasNoAccess_Returns403()
    {
        factory.GuildAccessResponse = new ChannelAccessResult(false, Guid.NewGuid());
        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/channels/{Guid.NewGuid()}/messages");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetMessages_WithValidAccess_Returns200_AndMessagesNewestFirst()
    {
        var channelId = Guid.NewGuid();
        await SeedAsync(channelId, 3);
        factory.GuildAccessResponse = new ChannelAccessResult(true, Guid.NewGuid());

        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/channels/{channelId}/messages?limit=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<GetMessagesResponse>();
        Assert.NotNull(body);
        Assert.Equal(3, body.Messages.Count);
        Assert.Equal("msg2", body.Messages[0].Content);
        Assert.Equal("msg1", body.Messages[1].Content);
        Assert.Equal("msg0", body.Messages[2].Content);
        Assert.Null(body.NextCursor);
    }

    [Fact]
    public async Task GetMessages_WithDefaultLimit_Caps50()
    {
        var channelId = Guid.NewGuid();
        await SeedAsync(channelId, 60);
        factory.GuildAccessResponse = new ChannelAccessResult(true, Guid.NewGuid());

        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/channels/{channelId}/messages");
        var body = await response.Content.ReadFromJsonAsync<GetMessagesResponse>();

        Assert.NotNull(body);
        Assert.Equal(50, body.Messages.Count);
        Assert.NotNull(body.NextCursor);
    }

    [Fact]
    public async Task GetMessages_WithCursor_ReturnsOlderPage()
    {
        var channelId = Guid.NewGuid();
        await SeedAsync(channelId, 5);
        factory.GuildAccessResponse = new ChannelAccessResult(true, Guid.NewGuid());

        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var firstResp = await client.GetAsync($"/channels/{channelId}/messages?limit=2");
        var firstBody = await firstResp.Content.ReadFromJsonAsync<GetMessagesResponse>();
        Assert.NotNull(firstBody);
        Assert.NotNull(firstBody.NextCursor);

        var secondResp = await client.GetAsync(
            $"/channels/{channelId}/messages?limit=2&cursor={firstBody.NextCursor}");
        var secondBody = await secondResp.Content.ReadFromJsonAsync<GetMessagesResponse>();

        Assert.NotNull(secondBody);
        Assert.Equal(2, secondBody.Messages.Count);
        // Pages must not overlap
        Assert.DoesNotContain(secondBody.Messages, m => firstBody.Messages.Any(f => f.Id == m.Id));
    }

    [Fact]
    public async Task GetMessages_WithInvalidLimit_Returns400()
    {
        factory.GuildAccessResponse = new ChannelAccessResult(true, Guid.NewGuid());
        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var responseZero = await client.GetAsync($"/channels/{Guid.NewGuid()}/messages?limit=0");
        var responseHuge = await client.GetAsync($"/channels/{Guid.NewGuid()}/messages?limit=1000");

        Assert.Equal(HttpStatusCode.BadRequest, responseZero.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, responseHuge.StatusCode);
    }

    [Fact]
    public async Task GetMessages_EmptyChannel_ReturnsEmptyListAndNullCursor()
    {
        factory.GuildAccessResponse = new ChannelAccessResult(true, Guid.NewGuid());
        var client = NewClient();
        Authorize(client, Guid.NewGuid().ToString());

        var response = await client.GetAsync($"/channels/{Guid.NewGuid()}/messages?limit=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<GetMessagesResponse>();
        Assert.NotNull(body);
        Assert.Empty(body.Messages);
        Assert.Null(body.NextCursor);
    }
}
