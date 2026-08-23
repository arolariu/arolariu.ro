namespace AppHost.Aspire;

/// <summary>
/// Produces the environment contract for local-only bootstrap resources.
/// </summary>
internal static class LocalDevelopmentResourceConfiguration
{
  internal static IReadOnlyDictionary<string, string> CreateBootstrapEnvironment(
    string manifestPath)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(manifestPath);

    return new Dictionary<string, string>(StringComparer.Ordinal)
    {
      ["DOTNET_ENVIRONMENT"] = "Development",
      ["INFRA"] = "local",
      ["SEED_MANIFEST_PATH"] = manifestPath,
    };
  }

  internal static IReadOnlyDictionary<string, string> CreateIdentityEnvironment(
    string configPath,
    string swaggerOrigin)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(configPath);
    ArgumentException.ThrowIfNullOrWhiteSpace(swaggerOrigin);

    return new Dictionary<string, string>(StringComparer.Ordinal)
    {
      ["DOTNET_ENVIRONMENT"] = "Development",
      ["INFRA"] = "local",
      ["LOCAL_CONFIG_PATH"] = configPath,
      ["LOCAL_SWAGGER_ORIGIN"] = swaggerOrigin,
    };
  }
}
