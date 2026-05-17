 using NexTalk.Guild.Service.Features.Invites.CreateInvite;
using NexTalk.Guild.Service.Shared.Exceptions;
using Xunit;

namespace NexTalk.Guild.Service.Tests.Features.Invites.CreateInvite;

public class CreateInviteEndpointParseTests
{
    [Theory]
    [InlineData("30s", 30)]
    [InlineData("15m", 15 * 60)]
    [InlineData("24h", 24 * 3600)]
    [InlineData("7d", 7 * 24 * 3600)]
    public void ParseExpiresIn_ParsesUnitSuffixes(string input, long expectedSeconds)
    {
        var req = new CreateInviteEndpoint.Request(input, null, null);
        var result = CreateInviteEndpoint.ParseExpiresIn(req);
        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), result);
    }

    [Fact]
    public void ParseExpiresIn_FallsBackToExpiresInSeconds_WhenStringMissing()
    {
        var req = new CreateInviteEndpoint.Request(null, 3600, null);
        var result = CreateInviteEndpoint.ParseExpiresIn(req);
        Assert.Equal(TimeSpan.FromHours(1), result);
    }

    [Fact]
    public void ParseExpiresIn_StringTakesPrecedenceOverInteger()
    {
        var req = new CreateInviteEndpoint.Request("2h", 60, null);
        var result = CreateInviteEndpoint.ParseExpiresIn(req);
        Assert.Equal(TimeSpan.FromHours(2), result);
    }

    [Fact]
    public void ParseExpiresIn_ReturnsNull_WhenBothMissing()
    {
        var req = new CreateInviteEndpoint.Request(null, null, null);
        Assert.Null(CreateInviteEndpoint.ParseExpiresIn(req));
    }

    [Theory]
    [InlineData("24")]      // no unit
    [InlineData("h")]       // no number
    [InlineData("24x")]     // unknown unit
    [InlineData("-5h")]     // negative
    [InlineData("0h")]      // zero
    [InlineData("abc")]     // garbage
    public void ParseExpiresIn_RejectsInvalidStrings(string input)
    {
        var req = new CreateInviteEndpoint.Request(input, null, null);
        Assert.Throws<BadRequestException>(() => CreateInviteEndpoint.ParseExpiresIn(req));
    }
}
