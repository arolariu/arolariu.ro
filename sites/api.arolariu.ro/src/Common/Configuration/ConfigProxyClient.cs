namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
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
    var requestIdentifier = activity?.TraceId.ToString();
    if (string.IsNullOrWhiteSpace(requestIdentifier))
    {
      requestIdentifier = Activity.Current?.TraceId.ToString();
    }
    if (string.IsNullOrWhiteSpace(requestIdentifier))
    {
      requestIdentifier = Guid.CreateVersion7().ToString("N");
    }

    activity?.SetTag("config.key", name);
    if (!string.IsNullOrEmpty(label)) activity?.SetTag("config.label", label);
    activity?.SetTag("exp.target", "api");
    activity?.SetTag("peer.service", "exp");
    activity?.SetTag("correlation.request_id", requestIdentifier);
    activity?
      .SetLayerContext("Broker", nameof(ConfigProxyClient))
      .SetOperationType("Config.Read");

    using var logScope = logger.BeginScope(new Dictionary<string, object?>
    {
      ["correlation.request_id"] = requestIdentifier,
      ["peer.service"] = "exp",
      ["config.key"] = name,
      ["config.label"] = label
    });

    try
    {
      var uri = $"/api/v1/config?name={Uri.EscapeDataString(name)}";
      if (!string.IsNullOrEmpty(label))
      {
        uri += $"&label={Uri.EscapeDataString(label)}";
      }

      var requestUri = new Uri(uri, UriKind.Relative);
      using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
      if (!string.IsNullOrWhiteSpace(requestIdentifier))
      {
        request.Headers.TryAddWithoutValidation("X-Request-Id", requestIdentifier);
      }

      using var response = await httpClient.SendAsync(request, ct).ConfigureAwait(false);

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
