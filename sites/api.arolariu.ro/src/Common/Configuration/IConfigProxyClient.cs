namespace arolariu.Backend.Common.Configuration;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

/// <summary>Client for fetching configuration from exp.arolariu.ro.</summary>
public interface IConfigProxyClient
{
  /// <summary>Fetches a single configuration value by key.</summary>
  /// <param name="key">The configuration key to retrieve.</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>The configuration value, or null if not found.</returns>
  Task<string?> GetValueAsync(string key, CancellationToken ct = default);

  /// <summary>Fetches multiple configuration values.</summary>
  /// <param name="keys">The configuration keys to retrieve.</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>A read-only dictionary of configuration key-value pairs.</returns>
  Task<IReadOnlyDictionary<string, string>> GetValuesAsync(IEnumerable<string> keys, CancellationToken ct = default);

  /// <summary>Fetches the catalog that defines allowed and required keys for a target caller.</summary>
  /// <param name="target">The target caller identifier (for example: api, website).</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>The typed catalog response, or null when unavailable.</returns>
  Task<ConfigCatalogResponse?> GetCatalogAsync(string target, CancellationToken ct = default);
}
