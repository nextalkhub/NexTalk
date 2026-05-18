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
        // HS256 symmetric-key JWT. MessagingServiceFactory переключает JwtBearer на легаси
        // JwtSecurityTokenHandler (UseSecurityTokenValidators = true) из-за IDX14102 с newer handler.
        // Оба хэндлера принимают стандартный JWT, поэтому токен, созданный здесь, проходит валидацию.
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey));
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([new Claim("sub", userId)]),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }

    // Перегрузка для обратной совместимости с тестами, передающими Guid.
    public static string Generate(Guid userId) => Generate(userId.ToString());
}
