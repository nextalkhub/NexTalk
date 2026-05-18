using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace NextTalk.Websocket.Gateway.Tests.Infrastructure;

public static class TestJwt
{
    public const string SigningKey = "test-signing-key-minimum-32-chars!!";

    public static string Generate(string userId, string name = "Test User", string username = "testuser")
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey));
        var token = new JwtSecurityToken(
            claims:
            [
                new Claim("sub", userId),
                new Claim("name", name),
                new Claim("preferred_username", username),
            ],
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // Перегрузка для обратной совместимости с тестами, передающими Guid.
    public static string Generate(Guid userId, string name = "Test User", string username = "testuser") =>
        Generate(userId.ToString(), name, username);
}
