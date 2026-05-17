using System.Net;
using Microsoft.EntityFrameworkCore;
using NexTalk.Messaging.Service.Domain;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.Features.Messages.DeleteMessage;

public class DeleteMessageEndpointTests : IAsyncLifetime
{
    private readonly MessagingServiceFactory _factory = new();
    private MessagingDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _db = await _factory.GetDbContextAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        _factory.Dispose();
    }

    private async Task<(Message message, Guid authorId, Guid guildId, Guid channelId)> CreateMessageAsync()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var authorId = Guid.NewGuid();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            ChannelId = channelId,
            AuthorId = authorId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();

        return (message, authorId, guildId, channelId);
    }

    [Fact]
    public async Task Delete_WithAuthor_Returns204()
    {
        var (message, authorId, _, _) = await CreateMessageAsync();
        var client = _factory.CreateAuthenticatedClient(authorId);

        var response = await client.DeleteAsync($"/messages/{message.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithAuthor_RemovesFromDatabase()
    {
        var (message, authorId, _, _) = await CreateMessageAsync();
        var client = _factory.CreateAuthenticatedClient(authorId);

        await client.DeleteAsync($"/messages/{message.Id}");

        var deleted = await _db.Messages.FirstOrDefaultAsync(m => m.Id == message.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task Delete_WithNonExistentMessage_Returns404()
    {
        var client = _factory.CreateAuthenticatedClient(Guid.NewGuid());
        var nonExistentId = Guid.NewGuid();

        var response = await client.DeleteAsync($"/messages/{nonExistentId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithoutBearerToken_Returns401()
    {
        var (message, _, _, _) = await CreateMessageAsync();
        var client = _factory.CreateClient();

        var response = await client.DeleteAsync($"/messages/{message.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
