namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

/// <summary>HTTP client for the exp.arolariu.ro config proxy.</summary>
public sealed class ConfigProxyClient(HttpClient httpClient) : IConfigProxyClient
{
  /// <inheritdoc />
  public async Task<string?> GetValueAsync(string key, CancellationToken ct = default)
  {
    var requestUri = new Uri($"/api/v2/config/{Uri.EscapeDataString(key)}", UriKind.Relative);
    var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    if (!response.IsSuccessStatusCode) return null;

    using var payload = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct).ConfigureAwait(false);
    if (payload is null) return null;

    return payload.RootElement.TryGetProperty("value", out var valueElement)
      ? valueElement.GetString()
      : null;
  }

  /// <inheritdoc />
  public async Task<IReadOnlyDictionary<string, string>> GetValuesAsync(IEnumerable<string> keys, CancellationToken ct = default)
  {
    var keysParam = string.Join(",", keys);
    var requestUri = new Uri($"/api/v2/config?keys={Uri.EscapeDataString(keysParam)}", UriKind.Relative);
    var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    if (!response.IsSuccessStatusCode) return new Dictionary<string, string>();

    using var payload = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct).ConfigureAwait(false);
    if (payload is null || !payload.RootElement.TryGetProperty("values", out var valuesElement) || valuesElement.ValueKind != JsonValueKind.Array)
    {
      return new Dictionary<string, string>();
    }

    return valuesElement.EnumerateArray()
      .Where(static item =>
        item.TryGetProperty("key", out var key) && key.ValueKind == JsonValueKind.String &&
        item.TryGetProperty("value", out var value) && value.ValueKind == JsonValueKind.String)
      .ToDictionary(
        static item => item.GetProperty("key").GetString()!,
        static item => item.GetProperty("value").GetString()!);
  }

  /// <inheritdoc />
  public async Task<ConfigCatalogResponse?> GetCatalogAsync(string target, CancellationToken ct = default)
  {
    var requestUri = new Uri($"/api/v2/catalog?for={Uri.EscapeDataString(target)}", UriKind.Relative);
    var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    if (!response.IsSuccessStatusCode) return null;

    return await response.Content.ReadFromJsonAsync<ConfigCatalogResponse>(cancellationToken: ct).ConfigureAwait(false);
  }
}
