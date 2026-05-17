using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using NexTalk.Messaging.Service.Domain;
using NexTalk.Messaging.Service.Features.Messages.DeleteMessage;
using NexTalk.Messaging.Service.Infrastructure;
using NexTalk.Messaging.Service.Shared;
using NexTalk.Messaging.Service.Shared.Exceptions;
using Xunit;

namespace NexTalk.Messaging.Service.Tests.Features.Messages.DeleteMessage;

public class DeleteMessageHandlerTests
{
    private readonly MessagingDbContext _db;
    private readonly Mock<IGuildServiceClient> _guildServiceMock;
    private readonly Mock<WsGatewayClient> _wsGatewayMock;
    private readonly DeleteMessageHandler _handler;

    public DeleteMessageHandlerTests()
    {
        var options = new DbContextOptionsBuilder<MessagingDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new MessagingDbContext(options);
        _guildServiceMock = new Mock<IGuildServiceClient>();
        _wsGatewayMock = new Mock<WsGatewayClient>(
            new HttpClient(new MockHttpMessageHandler()),
            Mock.Of<ILogger<WsGatewayClient>>());
        _handler = new DeleteMessageHandler(_db, _guildServiceMock.Object, _wsGatewayMock.Object);
    }

    private async Task<Message> CreateMessageAsync(Guid guildId, Guid channelId, Guid authorId)
    {
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
        return message;
    }

    [Fact]
    public async Task HandleAsync_WithAuthor_DeletesSuccessfully()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var authorId = Guid.NewGuid();
        var message = await CreateMessageAsync(guildId, channelId, authorId);

        var cmd = new DeleteMessageCommand(message.Id, authorId);
        await _handler.HandleAsync(cmd);

        var deleted = await _db.Messages.FirstOrDefaultAsync(m => m.Id == message.Id);
        Assert.Null(deleted);

        _guildServiceMock.Verify(x => x.RequireAdminOrOwnerAsync(
            It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_WithAuthor_BroadcastsToGuild()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var authorId = Guid.NewGuid();
        var message = await CreateMessageAsync(guildId, channelId, authorId);

        var cmd = new DeleteMessageCommand(message.Id, authorId);
        await _handler.HandleAsync(cmd);

        _wsGatewayMock.Verify(
            x => x.BroadcastToGuildAsync(
                guildId,
                "message.deleted",
                It.IsAny<object>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithNonAuthorAdmin_DeletesSuccessfully()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var authorId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        var message = await CreateMessageAsync(guildId, channelId, authorId);

        _guildServiceMock.Setup(x => x.RequireAdminOrOwnerAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var cmd = new DeleteMessageCommand(message.Id, adminId);
        await _handler.HandleAsync(cmd);

        var deleted = await _db.Messages.FirstOrDefaultAsync(m => m.Id == message.Id);
        Assert.Null(deleted);

        _guildServiceMock.Verify(x => x.RequireAdminOrOwnerAsync(
            channelId, adminId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithNonAuthorMember_ThrowsForbidden()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var authorId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var message = await CreateMessageAsync(guildId, channelId, authorId);

        _guildServiceMock.Setup(x => x.RequireAdminOrOwnerAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ForbiddenException("No access"));

        var cmd = new DeleteMessageCommand(message.Id, memberId);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() => _handler.HandleAsync(cmd));
        Assert.Equal("No access", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WithNonExistentMessage_ThrowsNotFound()
    {
        var nonExistentId = Guid.NewGuid();
        var callerId = Guid.NewGuid();

        var cmd = new DeleteMessageCommand(nonExistentId, callerId);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _handler.HandleAsync(cmd));
        Assert.Equal("Message not found.", ex.Message);
    }

    [Fact]
    public async Task HandleAsync_WhenBroadcastFails_ContinuesSuccessfully()
    {
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var authorId = Guid.NewGuid();
        var message = await CreateMessageAsync(guildId, channelId, authorId);

        _wsGatewayMock.Setup(x => x.BroadcastToGuildAsync(
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(),
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Gateway unavailable"));

        var cmd = new DeleteMessageCommand(message.Id, authorId);

        await _handler.HandleAsync(cmd);

        var deleted = await _db.Messages.FirstOrDefaultAsync(m => m.Id == message.Id);
        Assert.Null(deleted);
    }
}

public class MockHttpMessageHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage { StatusCode = System.Net.HttpStatusCode.OK });
    }
}
