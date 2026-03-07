namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

/// <summary>Represents the typed response returned by <c>GET /api/v1/run-time?for={target}</c>.</summary>
/// <remarks>
/// <para>The run-time endpoint provides a single-round-trip payload containing
/// all configuration key-value pairs, all feature flag states, and scheduling metadata for the
/// target caller. Clients should prefer this endpoint at startup and during refresh cycles over
/// composing several exp calls.</para>
/// <para><see cref="RefreshIntervalSeconds"/> is the server-authoritative hint for how frequently
/// the caller should re-fetch this payload. Clients MUST respect this value instead of using a
/// hard-coded interval.</para>
/// </remarks>
public sealed class BootstrapResponse
{
  /// <summary>Gets the caller target this bootstrap payload addresses (for example: <c>api</c>, <c>website</c>).</summary>
  [JsonPropertyName("target")]
  public string Target { get; init; } = string.Empty;

  /// <summary>Gets the schema contract version used to produce this payload.</summary>
  [JsonPropertyName("contractVersion")]
  public string ContractVersion { get; init; } = string.Empty;

  /// <summary>Gets the opaque version identifier of the run-time snapshot that was used to derive this payload.</summary>
  [JsonPropertyName("version")]
  public string Version { get; init; } = string.Empty;

  /// <summary>Gets the configuration key-value pairs resolved for the target caller.</summary>
  /// <remarks>
  /// Keys match the server-owned run-time configuration document for the requested target and
  /// may include both required and optional values.
  /// </remarks>
  [JsonPropertyName("config")]
  public IReadOnlyDictionary<string, string> Config { get; init; } = new Dictionary<string, string>();

  /// <summary>Gets the feature flag states for the target caller, keyed by feature identifier.</summary>
  [JsonPropertyName("features")]
  public IReadOnlyDictionary<string, bool> Features { get; init; } = new Dictionary<string, bool>();

  /// <summary>Gets the server-recommended refresh interval in seconds.</summary>
  [JsonPropertyName("refreshIntervalSeconds")]
  public int RefreshIntervalSeconds { get; init; } = 300;

  /// <summary>Gets the UTC timestamp at which the exp service produced this payload.</summary>
  [JsonPropertyName("fetchedAt")]
  public DateTimeOffset FetchedAt { get; init; } = DateTimeOffset.UtcNow;
}
