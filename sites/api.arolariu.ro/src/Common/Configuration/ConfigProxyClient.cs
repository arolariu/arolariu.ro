namespace arolariu.Backend.Common.Configuration;

using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

/// <summary>
/// HTTP client implementation for the exp config proxy, backed by the simplified <c>/api/v1</c> config endpoint.
/// </summary>
/// <remarks>
/// <para>All methods are stateless: each call issues exactly one HTTP GET request and
/// deserialises the JSON response. Retry, caching, and circuit-breaking policies belong in the
/// infrastructure layer that wraps this broker.</para>
/// </remarks>
public sealed class ConfigProxyClient(HttpClient httpClient, ILogger<ConfigProxyClient> logger) : IConfigProxyClient
{
  /// <inheritdoc />
  public async Task<ConfigValueResponse?> GetConfigValueAsync(string name, CancellationToken ct = default)
  {
    try
    {
      var requestUri = new Uri($"/api/v1/config?name={Uri.EscapeDataString(name)}", UriKind.Relative);
      using var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);

      if (!response.IsSuccessStatusCode)
      {
        logger.LogConfigKeyHttpError((int)response.StatusCode, name);
        return null;
      }

      return await response.Content.ReadFromJsonAsync<ConfigValueResponse>(cancellationToken: ct).ConfigureAwait(false);
    }
    catch (HttpRequestException ex)
    {
      logger.LogConfigKeyNetworkError(ex, name);
      return null;
    }
    catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
    {
      logger.LogConfigKeyTimeout(ex, name);
      return null;
    }
    catch (JsonException ex)
    {
      logger.LogConfigKeyDeserializationError(ex, name);
      return null;
    }
  }
}
