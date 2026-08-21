namespace LocalDevelopment.Bootstrap;

/// <summary>
/// Validates fixture-only relationships before domain materialization.
/// </summary>
internal static class SeedManifestValidator
{
  internal static void Validate(SeedScenarioManifest manifest)
  {
    ArgumentNullException.ThrowIfNull(manifest);

    if (string.IsNullOrWhiteSpace(manifest.Version))
    {
      throw new InvalidDataException("Seed scenario version is required.");
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
    _ = IndexUnique(
      manifest.Blobs,
      blob => blob.Key,
      _ => Guid.Empty,
      "blob",
      requireUniqueIdentifier: false);

    RequirePersona(personas, "alice", PersonaIds.Alice);
    RequirePersona(personas, "bob", PersonaIds.Bob);
    RequirePersona(personas, "charlie", PersonaIds.Charlie);

    foreach (SeedMerchantDefinition merchant in manifest.Merchants)
    {
      if (!personas.ContainsKey(merchant.OwnerKey))
      {
        throw new InvalidDataException(
          $"Merchant '{merchant.Key}' references unknown owner '{merchant.OwnerKey}'.");
      }
    }

    foreach (SeedInvoiceDefinition invoice in manifest.Invoices)
    {
      if (!personas.ContainsKey(invoice.OwnerKey))
      {
        throw new InvalidDataException(
          $"Invoice '{invoice.Key}' references unknown owner '{invoice.OwnerKey}'.");
      }

      if (!merchants.ContainsKey(invoice.MerchantKey))
      {
        throw new InvalidDataException(
          $"Invoice '{invoice.Key}' references unknown merchant '{invoice.MerchantKey}'.");
      }

      foreach (string sharedPersona in invoice.SharedWith)
      {
        if (!personas.ContainsKey(sharedPersona))
        {
          throw new InvalidDataException(
            $"Invoice '{invoice.Key}' references unknown shared persona '{sharedPersona}'.");
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

      foreach (SeedProductDefinition product in invoice.Products)
      {
        if (product.Quantity <= 0 || product.Price < 0)
        {
          throw new InvalidDataException(
            $"Invoice '{invoice.Key}' contains an invalid product.");
        }
      }
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
    IReadOnlyDictionary<string, SeedPersonaDefinition> personas,
    string key,
    Guid expectedIdentifier)
  {
    if (!personas.TryGetValue(key, out SeedPersonaDefinition? persona)
        || persona.UserIdentifier != expectedIdentifier)
    {
      throw new InvalidDataException(
        $"Seed persona '{key}' must use identifier '{expectedIdentifier}'.");
    }
  }

  private static void AssertApprovedCounts(
    SeedScenarioManifest manifest,
    IReadOnlyDictionary<string, SeedPersonaDefinition> personas)
  {
    int CountInvoices(string persona) =>
      manifest.Invoices.Count(invoice => invoice.OwnerKey == persona);
    int CountMerchants(string persona) =>
      manifest.Merchants.Count(merchant => merchant.OwnerKey == persona);

    if (CountInvoices("alice") != 8
        || CountMerchants("alice") != 5
        || CountInvoices("bob") != 0
        || CountMerchants("bob") != 0
        || CountInvoices("charlie") != 3
        || CountMerchants("charlie") != 2
        || personas.Count != 3)
    {
      throw new InvalidDataException(
        "Seed scenario does not match the approved Alice/Bob/Charlie record counts.");
    }
  }
}
