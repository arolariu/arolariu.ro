namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Threading;

/// <summary>Thread-safe in-memory cache for the API build-time configuration document.</summary>
public sealed class ConfigCatalogCache(ConfigCatalogResponse initialCatalog)
{
  private readonly Lock syncLock = new();
  private ConfigCatalogResponse currentCatalog = ValidateCatalogOrThrow(initialCatalog, nameof(initialCatalog));

  /// <summary>Gets the current catalog snapshot.</summary>
  public ConfigCatalogResponse CurrentCatalog
  {
    get
    {
      lock (syncLock)
      {
        return CloneCatalog(currentCatalog);
      }
    }
  }

  /// <summary>Creates a detached copy of the current config snapshot.</summary>
  /// <returns>A detached copy of the current config dictionary.</returns>
  public IReadOnlyDictionary<string, string> CreateConfigSnapshot()
  {
    lock (syncLock)
    {
      return new Dictionary<string, string>(currentCatalog.Config);
    }
  }

  /// <summary>Updates the catalog snapshot.</summary>
  /// <param name="catalog">The catalog returned by the exp service.</param>
  public void Update(ConfigCatalogResponse catalog)
  {
    ValidateCatalogOrThrow(catalog, nameof(catalog));

    lock (syncLock)
    {
      currentCatalog = CloneCatalog(catalog);
    }
  }

  private static ConfigCatalogResponse ValidateCatalogOrThrow(
    ConfigCatalogResponse? catalog,
    string parameterName)
  {
    if (catalog is null)
    {
      throw new ArgumentNullException(parameterName);
    }

    if (string.IsNullOrWhiteSpace(catalog.Version))
    {
      throw new ArgumentException("Catalog version cannot be null or empty.", parameterName);
    }

    if (catalog.Config.Count == 0)
    {
      throw new ArgumentException("Catalog must contain at least one config value.", parameterName);
    }

    return catalog;
  }

  private static ConfigCatalogResponse CloneCatalog(ConfigCatalogResponse source) => new()
  {
    Target = source.Target,
    ContractVersion = source.ContractVersion,
    Version = source.Version,
    Config = new Dictionary<string, string>(source.Config),
    RefreshIntervalSeconds = source.RefreshIntervalSeconds,
    FetchedAt = source.FetchedAt,
  };
}
