namespace arolariu.Backend.Common.Telemetry;

using System;
using System.Reflection;

using OpenTelemetry.Resources;

/// <summary>
/// Factory for creating a shared <see cref="ResourceBuilder"/> with consistent service identification attributes.
/// This eliminates the triple duplication of resource configuration across logging, tracing, and metering extensions.
/// </summary>
/// <remarks>
/// The resource builder produced by this factory includes:
/// <list type="bullet">
///   <item><c>service.name</c> — <see cref="OTelConstants.ServiceName"/></item>
///   <item><c>service.version</c> — Git commit SHA (from <c>COMMIT_SHA</c> env var), assembly version, or <c>1.0.0</c></item>
///   <item><c>service.instance.id</c> — Machine name</item>
///   <item><c>deployment.environment</c> — <c>ASPNETCORE_ENVIRONMENT</c> or <c>Development</c></item>
///   <item><c>service.namespace</c> — <see cref="OTelConstants.ServiceNamespace"/></item>
///   <item><c>cloud.role</c> — <see cref="OTelConstants.CloudRole"/></item>
///   <item><c>cloud.provider</c> — <see cref="OTelConstants.CloudProvider"/></item>
/// </list>
/// </remarks>
/// <example>
/// <code>
/// // In any OTel extension method:
/// otelOptions.SetResourceBuilder(ResourceBuilderFactory.Create());
/// </code>
/// </example>
public static class ResourceBuilderFactory
{
  /// <summary>
  /// Creates a <see cref="ResourceBuilder"/> pre-configured with the standard service identification attributes.
  /// </summary>
  /// <returns>A configured <see cref="ResourceBuilder"/> ready for use in OTel signal providers.</returns>
  public static ResourceBuilder Create()
  {
    var serviceVersion = Environment.GetEnvironmentVariable(OTelConstants.CommitShaEnvVar)
      ?? Assembly.GetExecutingAssembly().GetName().Version?.ToString()
      ?? OTelConstants.DefaultServiceVersion;

    var deploymentEnvironment = Environment.GetEnvironmentVariable(OTelConstants.EnvironmentEnvVar)
      ?? OTelConstants.DefaultEnvironment;

    return ResourceBuilder.CreateDefault()
      .AddService(
        serviceName: OTelConstants.ServiceName,
        serviceVersion: serviceVersion,
        serviceInstanceId: Environment.MachineName)
      .AddAttributes([
        new("deployment.environment", deploymentEnvironment),
        new("service.namespace", OTelConstants.ServiceNamespace),
        new("cloud.role", OTelConstants.CloudRole),
        new("cloud.provider", OTelConstants.CloudProvider)
      ]);
  }
}
