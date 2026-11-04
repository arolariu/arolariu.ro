namespace LocalDevelopment.Bootstrap.Scenarios.Invoices;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Validates fixture-only relationships before domain materialization.
/// </summary>
internal static class SeedManifestValidator
{
  private static readonly Lazy<JsonTaxonomyBroker> Taxonomies = new(() => new JsonTaxonomyBroker());
  private sealed record Profile(int Active, int Merchants, int Minimum, int Maximum, int Days, int Regions, int Countries);

  private static readonly Dictionary<string, Profile> Profiles = new(StringComparer.Ordinal)
  {
    ["alice"] = new(300, 100, 2, 50, 365, 3, 2),
    ["bob"] = new(5, 4, 1, 10, 30, 1, 1),
    ["charlie"] = new(20, 7, 1, 20, 60, 2, 1),
    ["dmitryi"] = new(1000, 250, 1, 100, 1095, 0, 5),
  };

  internal static void Validate(SeedScenarioManifest manifest)
  {
    ArgumentNullException.ThrowIfNull(manifest);

    if (manifest.Version != SeedScenarioManifest.CurrentVersion)
    {
      throw new InvalidDataException($"Seed scenario must use coordinated version {SeedScenarioManifest.CurrentVersion}.");
    }

    Dictionary<string, SeedPersonaDefinition> personas = IndexUnique(
      manifest.Personas,
      persona => persona.Key,
      persona => persona.UserIdentifier,
      "persona");
    Dictionary<string, SeedMerchantDefinition> merchants = IndexUnique(
      manifest.Merchants,
      merchant => merchant.Key,
      merchant => merchant.Id,
      "merchant");
    _ = IndexUnique(
      manifest.Invoices,
      invoice => invoice.Key,
      invoice => invoice.Id,
      "invoice");
    Dictionary<string, SeedBlobDefinition> blobs = IndexUnique(
      manifest.Blobs,
      blob => blob.Key,
      _ => Guid.Empty,
      "blob",
      requireUniqueIdentifier: false);

    RequirePersona(personas, "alice", PersonaIds.Alice);
    RequirePersona(personas, "bob", PersonaIds.Bob);
    RequirePersona(personas, "charlie", PersonaIds.Charlie);
    RequirePersona(personas, "dmitryi", PersonaIds.Dmitryi);

    foreach (SeedMerchantDefinition merchant in manifest.Merchants)
    {
      if (!personas.ContainsKey(merchant.OwnerKey))
      {
        throw new InvalidDataException(
          $"Merchant '{merchant.Key}' references unknown owner '{merchant.OwnerKey}'.");
      }

      if (CurrencyForCountry(merchant.CountryCode) is null || !ValidRegion(merchant.CountryCode, merchant.Region)
          || string.IsNullOrWhiteSpace(merchant.City) || string.IsNullOrWhiteSpace(merchant.StreetAddress)
          || string.IsNullOrWhiteSpace(merchant.Name))
      {
        throw new InvalidDataException($"Merchant '{merchant.Key}' has invalid geographic or display values.");
      }
      ValidateClassification(ClassificationSystem.Nace21, merchant.ClassificationCode, merchant.ClassificationLabel,
        merchant.ClassificationPath, merchant.Key);
    }

    foreach (SeedInvoiceDefinition invoice in manifest.Invoices)
    {
      if (!personas.ContainsKey(invoice.OwnerKey))
      {
        throw new InvalidDataException(
          $"Invoice '{invoice.Key}' references unknown owner '{invoice.OwnerKey}'.");
      }

      if (!merchants.TryGetValue(invoice.MerchantKey, out SeedMerchantDefinition? merchant))
      {
        throw new InvalidDataException(
          $"Invoice '{invoice.Key}' references unknown merchant '{invoice.MerchantKey}'.");
      }
      if (merchant.OwnerKey != invoice.OwnerKey)
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' references a merchant with a different owner.");
      }
      Profile profile = Profiles[invoice.OwnerKey];
      if (invoice.Products is null || invoice.Products.Count < profile.Minimum || invoice.Products.Count > profile.Maximum)
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' has an invalid product count for '{invoice.OwnerKey}'.");
      }
      if (invoice.DaysAgo < 0 || invoice.DaysAgo > profile.Days)
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' falls outside the '{invoice.OwnerKey}' history window.");
      }
      if (invoice.DaysAgo == 0 && invoice.TransactionTimeUtc != TimeOnly.MinValue)
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' must use midnight for a day-zero checkout.");
      }
      if (invoice.CurrencyCode != CurrencyForCountry(merchant.CountryCode))
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' currency does not match its merchant country.");
      }
      if (!string.Equals(invoice.PaymentType, "SPLIT", StringComparison.OrdinalIgnoreCase)
          && (!Enum.TryParse(invoice.PaymentType, ignoreCase: true, out PaymentType paymentType) || !Enum.IsDefined(paymentType)))
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' has an invalid payment method.");
      }
      ValidateClassification(ClassificationSystem.EcoicopV2, invoice.ClassificationCode, invoice.ClassificationLabel,
        invoice.ClassificationPath, invoice.Key);

      if (invoice.BlobKey is not null
          && !blobs.ContainsKey(invoice.BlobKey))
      {
        throw new InvalidDataException(
          $"Invoice '{invoice.Key}' references unknown blob '{invoice.BlobKey}'.");
      }

      foreach (string sharedPersona in invoice.SharedWith)
      {
        if (string.IsNullOrWhiteSpace(sharedPersona) || !personas.ContainsKey(sharedPersona) || sharedPersona == invoice.OwnerKey)
        {
          throw new InvalidDataException(
            $"Invoice '{invoice.Key}' references unknown shared persona '{sharedPersona}'.");
        }
        if (invoice.SharedWith.Distinct(StringComparer.Ordinal).Count() != invoice.SharedWith.Count)
        {
          throw new InvalidDataException($"Invoice '{invoice.Key}' has duplicate sharing references.");
        }
      }

      if (invoice.DaysAgo < 0
          || invoice.TotalAmount < 0
          || invoice.TaxAmount < 0
          || invoice.TaxAmount > invoice.TotalAmount)
      {
        throw new InvalidDataException(
          $"Invoice '{invoice.Key}' contains invalid temporal or payment values.");
      }

      var codes = new HashSet<string>(StringComparer.Ordinal);
      foreach (SeedProductDefinition product in invoice.Products)
      {
        if (product is null || product.Quantity <= 0 || product.Price < 0
            || string.IsNullOrWhiteSpace(product.Name) || string.IsNullOrWhiteSpace(product.QuantityUnit))
        {
          throw new InvalidDataException(
            $"Invoice '{invoice.Key}' contains an invalid product.");
        }
        if (string.IsNullOrWhiteSpace(product.ProductCode) || !codes.Add(product.ProductCode))
        {
          throw new InvalidDataException($"Invoice '{invoice.Key}' has a duplicate or blank product SKU.");
        }
        if (product.TaxRate is < 0 or > 100)
        {
          throw new InvalidDataException($"Invoice '{invoice.Key}' product '{product.ProductCode}' has an invalid tax rate.");
        }
        decimal extended = product.Quantity * product.Price;
        if (decimal.Round(extended, 2) != extended)
        {
          throw new InvalidDataException($"Invoice '{invoice.Key}' product '{product.ProductCode}' contains fractional cents.");
        }
        string allergenState = product.AllergenState.ToLowerInvariant();
        if (allergenState is not ("detected" or "none" or "insufficient" or "unassessed")
            || product.AllergenCodes is null
            || (allergenState == "detected") != (product.AllergenCodes.Count > 0)
            || product.AllergenCodes.Any(code => !Enum.IsDefined(code))
            || product.AllergenCodes.Distinct().Count() != product.AllergenCodes.Count)
        {
          throw new InvalidDataException($"Invoice '{invoice.Key}' product '{product.ProductCode}' has inconsistent allergen evidence.");
        }
        ValidateClassification(ClassificationSystem.Gs1Gpc, product.ClassificationCode, product.ClassificationLabel, product.ClassificationPath,
          $"{invoice.Key}/{product.ProductCode}");
      }
      if (invoice.Products.Sum(product => product.Quantity * product.Price) != invoice.TotalAmount
          || SeedFinancials.CreateTaxDetails(invoice.Products).Sum(detail => detail.Amount) != invoice.TaxAmount)
      {
        throw new InvalidDataException($"Invoice '{invoice.Key}' has inconsistent financial totals or tax.");
      }
      ValidateRecipe(invoice, codes);
    }

    AssertApprovedCounts(manifest, personas);
  }

  private static Dictionary<string, TDefinition> IndexUnique<TDefinition>(
    IReadOnlyList<TDefinition> definitions,
    Func<TDefinition, string> keySelector,
    Func<TDefinition, Guid> identifierSelector,
    string label,
    bool requireUniqueIdentifier = true)
  {
    ArgumentNullException.ThrowIfNull(definitions);

    var byKey = new Dictionary<string, TDefinition>(StringComparer.Ordinal);
    var identifiers = new HashSet<Guid>();

    foreach (TDefinition definition in definitions)
    {
      if (definition is null) { throw new InvalidDataException($"Seed {label} collection contains a null record."); }
      string key = keySelector(definition);

      if (string.IsNullOrWhiteSpace(key) || !byKey.TryAdd(key, definition))
      {
        throw new InvalidDataException($"Duplicate or blank {label} key '{key}'.");
      }

      Guid identifier = identifierSelector(definition);
      if (requireUniqueIdentifier
          && (identifier == Guid.Empty || !identifiers.Add(identifier)))
      {
        throw new InvalidDataException(
          $"Duplicate or empty {label} identifier '{identifier}'.");
      }
    }

    return byKey;
  }

  private static void RequirePersona(
    Dictionary<string, SeedPersonaDefinition> personas,
    string key,
    Guid expectedIdentifier)
  {
    if (!personas.TryGetValue(key, out SeedPersonaDefinition? persona)
        || persona.UserIdentifier != expectedIdentifier
        || persona.Subject != $"{key}@arolariu.ro")
    {
      throw new InvalidDataException(
        $"Seed persona '{key}' must use identifier '{expectedIdentifier}'.");
    }
  }

  private static void AssertApprovedCounts(
    SeedScenarioManifest manifest,
    Dictionary<string, SeedPersonaDefinition> personas)
  {
    if (personas.Count != Profiles.Count)
    {
      throw new InvalidDataException(
        "Seed scenario does not match the approved four-persona active invoice and merchant counts.");
    }

    Dictionary<string, SeedMerchantDefinition> merchants = manifest.Merchants.ToDictionary(merchant => merchant.Key, StringComparer.Ordinal);
    foreach (var (owner, profile) in Profiles)
    {
      SeedInvoiceDefinition[] active = manifest.Invoices.Where(invoice => invoice.OwnerKey == owner && !invoice.IsSoftDeleted).ToArray();
      SeedMerchantDefinition[] ownedMerchants = manifest.Merchants.Where(merchant => merchant.OwnerKey == owner).ToArray();
      if (active.Length != profile.Active || ownedMerchants.Length != profile.Merchants)
      {
        throw new InvalidDataException($"Persona '{owner}' has incorrect active invoice or merchant counts.");
      }
      HashSet<string> used = active.Select(invoice => invoice.MerchantKey).ToHashSet(StringComparer.Ordinal);
      if (used.Count != ownedMerchants.Length)
      {
        throw new InvalidDataException($"Persona '{owner}' has merchants without active invoice references.");
      }
      SeedMerchantDefinition[] visited = used.Select(key => merchants[key]).ToArray();
      if (visited.Select(merchant => merchant.CountryCode).Distinct(StringComparer.Ordinal).Count() != profile.Countries
          || (profile.Regions > 0 && visited.Select(merchant => (merchant.CountryCode, merchant.Region)).Distinct().Count() != profile.Regions))
      {
        throw new InvalidDataException($"Persona '{owner}' has incorrect geographic coverage through active purchases.");
      }
      if (owner == "dmitryi" && active.Sum(invoice => invoice.Products.Count) != 18000)
      {
        throw new InvalidDataException("Persona 'dmitryi' must have exactly 18000 active product lines.");
      }
    }

    SeedInvoiceDefinition[] deleted = manifest.Invoices.Where(invoice => invoice.IsSoftDeleted).ToArray();
    if (deleted.Length != 1 || deleted[0].OwnerKey != "alice")
    {
      throw new InvalidDataException("Only the additional Alice soft-deleted invoice is part of this scenario.");
    }
  }

  private static string? CurrencyForCountry(string country) => country switch
  {
    "RO" => "RON",
    "FR" or "DE" or "IT" or "ES" => "EUR",
    _ => null,
  };

  private static bool ValidRegion(string country, string region) => (country, region) switch
  {
    ("RO", "Bucuresti-Ilfov" or "Nord-Vest") => true,
    ("FR", "Ile-de-France") or ("DE", "Berlin") or ("IT", "Lazio") or ("ES", "Catalonia") => true,
    _ => false,
  };

  private static void ValidateClassification(ClassificationSystem system, string? code, string? label,
    IReadOnlyList<ClassificationNode>? path, string key)
  {
    if (code is null && label is null && path is null) { return; }
    if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(label) || path is null || path.Count == 0
        || path.Any(node => node is null) || path[^1].Code != code || path[^1].OfficialLabel != label)
    {
      throw new InvalidDataException($"Seed '{key}' has an incomplete classification hierarchy.");
    }
    JsonTaxonomyBroker catalog = Taxonomies.Value;
    if (!catalog.Contains(system, code))
    {
      throw new InvalidDataException($"Seed '{key}' references an unknown canonical classification code.");
    }
    StandardClassification canonical = catalog.Resolve(system, code, ClassificationOrigin.Manual, null, []);
    if (canonical.Code != code || canonical.OfficialLabel != label || !canonical.Hierarchy.SequenceEqual(path))
    {
      throw new InvalidDataException($"Seed '{key}' has a noncanonical classification hierarchy or official label.");
    }
  }

  private static void ValidateRecipe(SeedInvoiceDefinition invoice, HashSet<string> products)
  {
    if (invoice.Recipe is not { } recipe) { return; }
    if (string.IsNullOrWhiteSpace(recipe.Name) || string.IsNullOrWhiteSpace(recipe.Description)
        || recipe.Servings <= 0 || recipe.PreparationMinutes < 0 || recipe.CookingMinutes < 0 || !Enum.IsDefined(recipe.Difficulty)
        || recipe.Steps.Count == 0 || recipe.Steps.Any(string.IsNullOrWhiteSpace)
        || recipe.PurchasedIngredients.Count == 0
        || recipe.PurchasedIngredients.Any(ingredient => ingredient is null || !products.Contains(ingredient.ProductCode) || string.IsNullOrWhiteSpace(ingredient.Quantity))
        || recipe.PurchasedIngredients.Select(ingredient => ingredient.ProductCode).Distinct(StringComparer.Ordinal).Count() != recipe.PurchasedIngredients.Count
        || recipe.PantryIngredients.Any(ingredient => ingredient is null || string.IsNullOrWhiteSpace(ingredient.Name) || string.IsNullOrWhiteSpace(ingredient.Quantity)))
    {
      throw new InvalidDataException($"Invoice '{invoice.Key}' has invalid recipe ingredients or instructions.");
    }
  }
}
