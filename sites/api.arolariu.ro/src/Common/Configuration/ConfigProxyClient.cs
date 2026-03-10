namespace arolariu.Backend.Common.Configuration;

using System;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Telemetry.Tracing;

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
  public async Task<ConfigValueResponse?> GetConfigValueAsync(string name, string? label = null, CancellationToken ct = default)
  {
    using var activity = ActivityGenerators.CommonPackageTracing.StartActivity("exp.config.fetch");
    activity?.SetTag("config.key", name);
    if (!string.IsNullOrEmpty(label)) activity?.SetTag("config.label", label);

    try
    {
      var uri = $"/api/v1/config?name={Uri.EscapeDataString(name)}";
      if (!string.IsNullOrEmpty(label))
      {
        uri += $"&label={Uri.EscapeDataString(label)}";
      }

      var requestUri = new Uri(uri, UriKind.Relative);
      using var response = await httpClient.GetAsync(requestUri, ct).ConfigureAwait(false);

      activity?.SetTag("http.response.status_code", (int)response.StatusCode);

      if (!response.IsSuccessStatusCode)
      {
        activity?.SetStatus(ActivityStatusCode.Error, $"HTTP {(int)response.StatusCode}");
        logger.LogConfigKeyHttpError((int)response.StatusCode, name);
        return null;
      }

      var result = await response.Content.ReadFromJsonAsync<ConfigValueResponse>(cancellationToken: ct).ConfigureAwait(false);
      activity?.SetTag("config.resolved", result is not null);
      return result;
    }
    catch (HttpRequestException ex)
    {
      activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
      activity?.AddEvent(new ActivityEvent("exception", tags: new ActivityTagsCollection { { "exception.type", ex.GetType().Name }, { "exception.message", ex.Message } }));
      logger.LogConfigKeyNetworkError(ex, name);
      return null;
    }
    catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
    {
      activity?.SetStatus(ActivityStatusCode.Error, "timeout");
      logger.LogConfigKeyTimeout(ex, name);
      return null;
    }
    catch (JsonException ex)
    {
      activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
      logger.LogConfigKeyDeserializationError(ex, name);
      return null;
    }
  }
}
