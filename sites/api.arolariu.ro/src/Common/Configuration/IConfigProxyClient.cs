namespace arolariu.Backend.Common.Configuration;

using System.Threading;
using System.Threading.Tasks;

/// <summary>Single-key configuration fetcher that resolves individual config values from the exp service.</summary>
public interface IConfigProxyClient
{
  /// <summary>Fetches a single indexed configuration value by name.</summary>
  /// <param name="name">The canonical configuration key name (for example: <c>Endpoints:Service:Api</c>).</param>
  /// <param name="ct">Cancellation token for the operation.</param>
  /// <returns>The typed config value response, or <see langword="null"/> when the request fails or the service is unavailable.</returns>
  Task<ConfigValueResponse?> GetConfigValueAsync(string name, CancellationToken ct = default);
}
