namespace arolariu.Backend.Common.Configuration;

using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// HTTP client implementation for the exp config proxy, backed by the simplified <c>/api/v1</c> endpoints.
/// </summary>
/// <remarks>
/// <para>All methods are stateless: each call issues exactly one HTTP GET request and
/// deserialises the JSON response. Retry, caching, and circuit-breaking policies belong in the
/// infrastructure layer that wraps this broker.</para>
/// </remarks>
public sealed class ConfigProxyClient(HttpClient httpClient) : IConfigProxyClient
{
  /// <inheritdoc />
  public async Task<ConfigValueResponse?> GetConfigValueAsync(string name, CancellationToken ct = default)
  {
    var requestUri = new Uri($"/api/v1/config?name={Uri.EscapeDataString(name)}", UriKind.Relative);
    var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    if (!response.IsSuccessStatusCode) return null;

    return await response.Content.ReadFromJsonAsync<ConfigValueResponse>(cancellationToken: ct).ConfigureAwait(false);
  }

  /// <inheritdoc />
  public async Task<ConfigCatalogResponse?> GetBuildTimeAsync(string target, CancellationToken ct = default)
  {
    var requestUri = new Uri($"/api/v1/build-time?for={Uri.EscapeDataString(target)}", UriKind.Relative);
    var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    if (!response.IsSuccessStatusCode) return null;

    return await response.Content.ReadFromJsonAsync<ConfigCatalogResponse>(cancellationToken: ct).ConfigureAwait(false);
  }

  /// <inheritdoc />
  public async Task<BootstrapResponse?> GetRunTimeAsync(string target, CancellationToken ct = default)
  {
    var requestUri = new Uri($"/api/v1/run-time?for={Uri.EscapeDataString(target)}", UriKind.Relative);
    var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    if (!response.IsSuccessStatusCode) return null;

    return await response.Content.ReadFromJsonAsync<BootstrapResponse>(cancellationToken: ct).ConfigureAwait(false);
  }
}
