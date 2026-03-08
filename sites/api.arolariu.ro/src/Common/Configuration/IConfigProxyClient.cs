namespace arolariu.Backend.Common.Configuration;

using System.Threading;
using System.Threading.Tasks;

/// <summary>Client for fetching configuration and typed exp payloads from the simplified exp service contract.</summary>
public interface IConfigProxyClient
{
  /// <summary>Fetches a single indexed configuration value by name.</summary>
  /// <param name="name">The canonical configuration key name (for example: <c>Endpoints:Service:Api</c>).</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>The typed config value response, or <see langword="null"/> when the request fails or the service is unavailable.</returns>
  Task<ConfigValueResponse?> GetConfigValueAsync(string name, CancellationToken ct = default);

  /// <summary>Fetches the build-time configuration document for a target caller.</summary>
  /// <param name="target">The target caller identifier (for example: <c>api</c>, <c>website</c>).</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>The typed build-time response, or <see langword="null"/> when the request fails or the service is unavailable.</returns>
  Task<ConfigCatalogResponse?> GetBuildTimeAsync(string target, CancellationToken ct = default);

  /// <summary>Fetches the run-time payload that combines config values, feature flag states, and scheduling metadata.</summary>
  /// <param name="target">The target caller identifier (for example: <c>api</c>, <c>website</c>).</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>The typed run-time response, or <see langword="null"/> when the request fails or the service is unavailable.</returns>
  Task<BootstrapResponse?> GetRunTimeAsync(string target, CancellationToken ct = default);
}
