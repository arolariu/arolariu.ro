namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// Thread-safe in-memory cache for the API feature flag snapshot sourced from the exp service.
/// </summary>
/// <remarks>
/// <para>The cache stores a single replaceable snapshot of feature states. All reads return a
/// point-in-time copy so callers never observe a partially-updated dictionary. Updates are atomic
/// under a lightweight <c>lock</c>, making this safe for concurrent use by the background refresh
/// service and request-serving threads.</para>
/// <para>The cache is intentionally stateless beyond the current snapshot: it does not track
/// history, publish change events, or enforce feature ID allow-lists. Those concerns belong in
/// the orchestration layer.</para>
/// </remarks>
public sealed class FeatureSnapshotCache
{
  private readonly object _syncLock = new();
  private Dictionary<string, bool> _features;
  private string _contractVersion;
  private DateTimeOffset _fetchedAt;

  /// <summary>
  /// Initialises the cache with the bootstrap-seeded feature snapshot.
  /// </summary>
  /// <param name="initialFeatures">Initial feature flag dictionary (may be empty, must not be null).</param>
  /// <param name="contractVersion">The schema contract version associated with the snapshot.</param>
  /// <param name="fetchedAt">The UTC timestamp at which the snapshot was retrieved from the exp service.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="initialFeatures"/> is null.</exception>
  public FeatureSnapshotCache(
      IReadOnlyDictionary<string, bool> initialFeatures,
      string contractVersion,
      DateTimeOffset fetchedAt)
  {
    ArgumentNullException.ThrowIfNull(initialFeatures);
    _features = initialFeatures.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    _contractVersion = contractVersion ?? string.Empty;
    _fetchedAt = fetchedAt;
  }

  /// <summary>Gets a point-in-time copy of the current feature flag dictionary.</summary>
  public IReadOnlyDictionary<string, bool> CurrentFeatures
  {
    get
    {
      lock (_syncLock)
      {
        return _features.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
      }
    }
  }

  /// <summary>Gets the contract version of the currently cached snapshot.</summary>
  public string ContractVersion
  {
    get { lock (_syncLock) { return _contractVersion; } }
  }

  /// <summary>Gets the UTC timestamp at which the current snapshot was fetched from the exp service.</summary>
  public DateTimeOffset FetchedAt
  {
    get { lock (_syncLock) { return _fetchedAt; } }
  }

  /// <summary>
  /// Returns <see langword="true"/> when the named feature is present and enabled in the current snapshot.
  /// Returns <see langword="false"/> for unknown feature identifiers (closed-world assumption).
  /// </summary>
  /// <param name="featureId">The feature identifier to evaluate (must not be null or whitespace).</param>
  /// <returns><see langword="true"/> when the feature is explicitly enabled; <see langword="false"/> otherwise.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="featureId"/> is null or whitespace.</exception>
  public bool IsEnabled(string featureId)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(featureId);
    lock (_syncLock)
    {
      return _features.TryGetValue(featureId, out var enabled) && enabled;
    }
  }

  /// <summary>
  /// Atomically replaces the current snapshot with the supplied values.
  /// </summary>
  /// <param name="features">Replacement feature flag dictionary (must not be null).</param>
  /// <param name="contractVersion">The schema contract version of the new snapshot.</param>
  /// <param name="fetchedAt">The UTC timestamp at which the new snapshot was fetched.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="features"/> is null.</exception>
  public void Update(
      IReadOnlyDictionary<string, bool> features,
      string contractVersion,
      DateTimeOffset fetchedAt)
  {
    ArgumentNullException.ThrowIfNull(features);
    lock (_syncLock)
    {
      _features = features.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
      _contractVersion = contractVersion ?? string.Empty;
      _fetchedAt = fetchedAt;
    }
  }
}
