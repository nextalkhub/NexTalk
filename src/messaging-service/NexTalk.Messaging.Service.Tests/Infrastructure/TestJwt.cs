using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace NexTalk.Messaging.Service.Tests.Infrastructure;

public static class TestJwt
{
    public const string SigningKey = "test-signing-key-minimum-32-chars!!";

    public static string Generate(string userId)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey));
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([new Claim("sub", userId)]),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    public static string Generate(Guid userId) => Generate(userId.ToString());
}
