namespace arolariu.Backend.Common.Configuration;

using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>Thread-safe in-memory cache for the API configuration catalog.</summary>
public sealed class ConfigCatalogCache(ConfigCatalogResponse initialCatalog)
{
  private readonly object syncLock = new();
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

  /// <summary>Gets the required keys for the current catalog snapshot.</summary>
  public IReadOnlyList<string> RequiredKeys
  {
    get
    {
      lock (syncLock)
      {
        return currentCatalog.RequiredKeys.ToArray();
      }
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
    ArgumentNullException.ThrowIfNull(catalog, parameterName);
    if (string.IsNullOrWhiteSpace(catalog.Version))
    {
      throw new ArgumentException("Catalog version cannot be null or empty.", parameterName);
    }

    if (!catalog.RequiredKeys.Any())
    {
      throw new ArgumentException("Catalog must contain at least one required key.", parameterName);
    }

    return catalog;
  }

  private static ConfigCatalogResponse CloneCatalog(ConfigCatalogResponse source) => new()
  {
    Target = source.Target,
    Version = source.Version,
    RequiredKeys = source.RequiredKeys.ToArray(),
    OptionalKeys = source.OptionalKeys.ToArray(),
    AllowedPrefixes = source.AllowedPrefixes.ToArray(),
    RefreshIntervalSeconds = source.RefreshIntervalSeconds,
  };
}
