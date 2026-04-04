namespace arolariu.Backend.Common.Telemetry;

/// <summary>
/// Centralized constants for OpenTelemetry resource configuration across all signal types (logging, tracing, metrics).
/// These constants ensure consistent service identification in Azure Application Insights and other OTel backends.
/// </summary>
/// <remarks>
/// All three OTel extensions (<see cref="Logging.LoggingExtensions"/>, <see cref="Tracing.TracingExtensions"/>,
/// <see cref="Metering.MeteringExtensions"/>) use these shared constants via <see cref="ResourceBuilderFactory"/>
/// to eliminate configuration duplication and guarantee attribute alignment across signals.
/// </remarks>
public static class OTelConstants
{
  /// <summary>
  /// The logical service name reported to OTel backends.
  /// Maps to the <c>service.name</c> resource attribute.
  /// </summary>
  public const string ServiceName = "arolariu-api";

  /// <summary>
  /// The service namespace grouping related services.
  /// Maps to the <c>service.namespace</c> resource attribute.
  /// </summary>
  public const string ServiceNamespace = "arolariu.ro";

  /// <summary>
  /// The cloud role name used by Azure Application Insights for application map grouping.
  /// Maps to the <c>cloud.role</c> resource attribute.
  /// </summary>
  public const string CloudRole = "api";

  /// <summary>
  /// The cloud provider identifier.
  /// Maps to the <c>cloud.provider</c> resource attribute.
  /// </summary>
  public const string CloudProvider = "azure";

  /// <summary>
  /// The environment variable name used to resolve the service version (Git commit SHA).
  /// </summary>
  public const string CommitShaEnvVar = "COMMIT_SHA";

  /// <summary>
  /// The environment variable name used to resolve the deployment environment.
  /// </summary>
  public const string EnvironmentEnvVar = "ASPNETCORE_ENVIRONMENT";

  /// <summary>
  /// The fallback deployment environment name when the environment variable is not set.
  /// </summary>
  public const string DefaultEnvironment = "Development";

  /// <summary>
  /// The fallback service version when neither the commit SHA nor the assembly version is available.
  /// </summary>
  public const string DefaultServiceVersion = "1.0.0";
}
