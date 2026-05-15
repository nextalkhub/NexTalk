using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace NexTalk.Messaging.Service.Tests.Infrastructure;

public static class TestJwt
{
    public const string SigningKey = "test-signing-key-minimum-32-chars!!";

    public static string Generate(Guid userId)
    {
        // Use JsonWebTokenHandler (Microsoft.IdentityModel.JsonWebTokens) instead of the legacy
        // JwtSecurityTokenHandler — this is what JwtBearer 9.0.0 uses for validation by default
        // (Options.TokenHandlers). Using the same handler on both ends avoids encoding edge cases.
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey));
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([new Claim("sub", userId.ToString())]),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
