namespace LocalDevelopment.Identity;

using System.Text.Json;

/// <summary>
/// Configuration required to issue local development persona tokens.
/// </summary>
internal sealed record LocalIdentityOptions(
  string Issuer,
  string Audience,
  string Secret,
  string SwaggerOrigin)
{
  internal static LocalIdentityOptions Load(
    string configPath,
    string swaggerOrigin)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(configPath);
    ArgumentException.ThrowIfNullOrWhiteSpace(swaggerOrigin);

    using JsonDocument document = JsonDocument.Parse(
      File.ReadAllText(configPath));
    JsonElement root = document.RootElement;

    return new LocalIdentityOptions(
      ReadRequired(root, "Auth:JWT:Issuer"),
      ReadRequired(root, "Auth:JWT:Audience"),
      ReadRequired(root, "Auth:JWT:Secret"),
      swaggerOrigin);
  }

  private static string ReadRequired(
    JsonElement root,
    string key)
  {
    if (!root.TryGetProperty(key, out JsonElement value)
        || value.ValueKind != JsonValueKind.String
        || string.IsNullOrWhiteSpace(value.GetString()))
    {
      throw new InvalidOperationException(
        $"Local identity configuration key '{key}' is required.");
    }

    return value.GetString()!;
  }
}
