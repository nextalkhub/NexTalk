using System.Net;
using System.Net.Http.Json;
using NexTalk.Voice.Service.Tests.Infrastructure;
using Xunit;

namespace NexTalk.Voice.Service.Tests.Features;

/// <summary>
/// Проверяет, что публичные voice-эндпоинты защищены JWT, а internal - нет
/// (internal закрыт сетью, а не аутентификацией; nginx запрещает /internal извне).
/// </summary>
public class AuthRequiredTests(VoiceServiceFactory factory) : IClassFixture<VoiceServiceFactory>
{
    [Fact]
    public async Task Join_WithoutToken_Returns401()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync($"/voice/{Guid.NewGuid()}/join", new { });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Leave_WithoutToken_Returns401()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync($"/voice/{Guid.NewGuid()}/leave", new { });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task InternalDisconnectUser_DoesNotRequireJwt_AndIsIdempotentWhenUserNotInVoice()
    {
        var client = factory.CreateClient();

        var response = await client.DeleteAsync($"/internal/voice/{Guid.NewGuid()}/disconnect");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
