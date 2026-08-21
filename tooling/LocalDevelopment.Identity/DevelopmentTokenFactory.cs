namespace LocalDevelopment.Identity;

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

using Microsoft.IdentityModel.Tokens;

/// <summary>
/// Creates locally signed JWTs that use the API's production claim contract.
/// </summary>
internal sealed class DevelopmentTokenFactory
{
  private readonly LocalIdentityOptions options;
  private readonly TimeProvider timeProvider;
  private readonly SigningCredentials signingCredentials;

  internal DevelopmentTokenFactory(
    LocalIdentityOptions options,
    TimeProvider timeProvider)
  {
    ArgumentNullException.ThrowIfNull(options);
    ArgumentNullException.ThrowIfNull(timeProvider);

    if (Encoding.UTF8.GetByteCount(options.Secret) < 32)
    {
      throw new ArgumentException(
        "Local JWT secret must contain at least 32 UTF-8 bytes.",
        nameof(options));
    }

    this.options = options;
    this.timeProvider = timeProvider;
    signingCredentials = new SigningCredentials(
      new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Secret)),
      SecurityAlgorithms.HmacSha256);
  }

  internal string Create(DevelopmentPersona persona)
  {
    ArgumentNullException.ThrowIfNull(persona);

    DateTimeOffset now = timeProvider.GetUtcNow();
    var descriptor = new SecurityTokenDescriptor
    {
      Subject = new ClaimsIdentity(
      [
        new Claim(JwtRegisteredClaimNames.Sub, persona.Subject),
        new Claim("userIdentifier", persona.UserIdentifier.ToString()),
        new Claim("role", persona.Role),
      ]),
      Issuer = options.Issuer,
      Audience = options.Audience,
      NotBefore = now.UtcDateTime,
      IssuedAt = now.UtcDateTime,
      Expires = now.AddHours(8).UtcDateTime,
      SigningCredentials = signingCredentials,
    };

    var handler = new JwtSecurityTokenHandler();
    return handler.WriteToken(handler.CreateToken(descriptor));
  }
}
