namespace arolariu.Backend.Common.Configuration;

using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// HTTP client implementation for the exp config proxy, backed by the simplified <c>/api/v1</c> config endpoint.
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

    HttpResponseMessage response;
    try
    {
      response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);
    }
    catch (HttpRequestException)
    {
      return null;
    }
    catch (TaskCanceledException)
    {
      return null;
    }

    using (response)
    {
      if (!response.IsSuccessStatusCode) return null;

      try
      {
        return await response.Content.ReadFromJsonAsync<ConfigValueResponse>(cancellationToken: ct).ConfigureAwait(false);
      }
      catch (JsonException)
      {
        return null;
      }
    }
  }
}
