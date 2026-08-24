namespace LocalDevelopment.Bootstrap;

using System.Text.Json;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Loads and materializes the deterministic local development scenario.
/// </summary>
internal static class SeedData
{
  private const string SeedOrigin = "arolariu-local-seed";

  private static readonly JsonSerializerOptions SerializerOptions = new()
  {
    PropertyNameCaseInsensitive = true,
    Converters = { new JsonStringEnumConverter() },
  };

  internal static SeedScenarioManifest LoadManifest(string path)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(path);

    if (!File.Exists(path))
    {
      throw new InvalidDataException($"Seed manifest was not found at '{path}'.");
    }

    SeedScenarioManifest manifest =
      JsonSerializer.Deserialize<SeedScenarioManifest>(
        File.ReadAllText(path),
        SerializerOptions)
      ?? throw new InvalidDataException("Seed manifest could not be deserialized.");

    SeedManifestValidator.Validate(manifest);
    return manifest;
  }

  internal static MaterializedSeedScenario Materialize(
    SeedScenarioManifest manifest,
    DateOnly utcAnchorDate)
  {
    SeedManifestValidator.Validate(manifest);

    Dictionary<string, SeedPersonaDefinition> personas =
      manifest.Personas.ToDictionary(persona => persona.Key, StringComparer.Ordinal);
    Dictionary<string, SeedMerchantDefinition> merchantDefinitions =
      manifest.Merchants.ToDictionary(merchant => merchant.Key, StringComparer.Ordinal);

    List<Merchant> merchants = manifest.Merchants
      .Select(definition => CreateMerchant(
        definition,
        personas[definition.OwnerKey],
        manifest.Version,
        utcAnchorDate))
      .ToList();
    Dictionary<Guid, Merchant> merchantsById =
      merchants.ToDictionary(merchant => merchant.id);

    var invoices = new List<Invoice>(manifest.Invoices.Count);

    foreach (SeedInvoiceDefinition definition in manifest.Invoices)
    {
      SeedPersonaDefinition owner = personas[definition.OwnerKey];
      SeedMerchantDefinition merchantDefinition =
        merchantDefinitions[definition.MerchantKey];
      Invoice invoice = CreateInvoice(
        definition,
        owner,
        merchantDefinition.Id,
        personas,
        manifest.Version,
        utcAnchorDate);
      invoices.Add(invoice);
      merchantsById[merchantDefinition.Id].ReferencedInvoices.Add(invoice.id);
    }

    List<MaterializedSeedBlob> blobs = manifest.Blobs
      .Select(blob => new MaterializedSeedBlob(
        blob.Key,
        blob.ContentType,
        Convert.FromBase64String(blob.ContentBase64)))
      .ToList();

    return new MaterializedSeedScenario(merchants, invoices, blobs);
  }

  private static Merchant CreateMerchant(
    SeedMerchantDefinition definition,
    SeedPersonaDefinition owner,
    string version,
    DateOnly utcAnchorDate) =>
    new()
    {
      id = definition.Id,
      Name = definition.Name,
      Description = definition.Description,
      ParentCompanyId = definition.ParentCompanyId,
      Classification = CreateClassification(
        ClassificationSystem.Nace21,
        "2.1",
        definition.ClassificationCode,
        definition.ClassificationLabel,
        ClassificationOrigin.Analysis),
      Address = new ContactInformation
      {
        FullName = definition.Name,
        Address = "Bucharest, Romania",
        EmailAddress = $"{definition.Key.Replace('/', '.')}@example.test",
      },
      CreatedAt = ResolveDate(utcAnchorDate, 120),
      CreatedBy = owner.UserIdentifier,
      AdditionalMetadata =
      {
        ["seed.origin"] = SeedOrigin,
        ["seed.version"] = version,
        ["seed.key"] = definition.Key,
      },
    };

  private static Invoice CreateInvoice(
    SeedInvoiceDefinition definition,
    SeedPersonaDefinition owner,
    Guid merchantIdentifier,
    IReadOnlyDictionary<string, SeedPersonaDefinition> personas,
    string version,
    DateOnly utcAnchorDate)
  {
    DateTimeOffset transactionDate = ResolveDate(utcAnchorDate, definition.DaysAgo);
    Currency currency = CreateCurrency(definition.CurrencyCode);
    var invoice = new Invoice
    {
      id = definition.Id,
      UserIdentifier = owner.UserIdentifier,
      Name = definition.Name,
      Description = definition.Description,
      CreatedAt = transactionDate,
      CreatedBy = owner.UserIdentifier,
      IsImportant = definition.IsImportant,
      MerchantReference = merchantIdentifier,
      Classification = definition.ClassificationCode is null
        ? null
        : CreateClassification(
          ClassificationSystem.EcoicopV2,
          "2",
          definition.ClassificationCode,
          definition.ClassificationLabel
            ?? definition.ClassificationCode,
          ClassificationOrigin.Analysis),
      PaymentInformation = new PaymentInformation
      {
        TransactionDate = transactionDate,
        PaymentType = ParsePaymentType(definition.PaymentType),
        Currency = currency,
        TotalCostAmount = definition.TotalAmount,
        TotalTaxAmount = definition.TaxAmount,
        SubtotalAmount = definition.TotalAmount - definition.TaxAmount,
      },
      Items = definition.Products
        .Select(product => CreateProduct(product))
        .ToList(),
      PossibleRecipes = definition.IncludeRecipe
        ? [CreateRecipe(definition)]
        : [],
      ReceiptType = "Itemized",
      CountryRegion = "RO",
      TaxDetails =
      [
        new TaxDetail
        {
          Amount = definition.TaxAmount,
          Rate = 19,
          NetAmount = definition.TotalAmount - definition.TaxAmount,
          Description = "VAT",
        },
      ],
      Payments = CreatePayments(definition),
    };

    foreach (string sharedPersona in definition.SharedWith)
    {
      invoice.SharedWith.Add(personas[sharedPersona].UserIdentifier);
    }

    if (definition.BlobKey is not null)
    {
      invoice.Scans.Add(new InvoiceScan(
        ScanType.PNG,
        new Uri(
          $"http://localhost:10000/devstoreaccount1/invoices/seed/{definition.BlobKey}.png"),
        new Dictionary<string, object>
        {
          ["seed.key"] = definition.BlobKey,
        }));
    }

    invoice.AdditionalMetadata["seed.origin"] = SeedOrigin;
    invoice.AdditionalMetadata["seed.version"] = version;
    invoice.AdditionalMetadata["seed.key"] = definition.Key;

    if (definition.IsSoftDeleted)
    {
      invoice.SoftDelete();
      foreach (Product product in invoice.Items)
      {
        ProductMetadata metadata = product.Metadata;
        metadata.IsSoftDeleted = true;
        product.Metadata = metadata;
      }
    }

    return invoice;
  }

  private static Product CreateProduct(SeedProductDefinition definition) =>
    new()
    {
      Name = definition.Name,
      Quantity = definition.Quantity,
      QuantityUnit = definition.QuantityUnit,
      ProductCode = definition.ProductCode,
      Price = definition.Price,
      Classification = definition.ClassificationCode is null
        ? null
        : CreateClassification(
          ClassificationSystem.Gs1Gpc,
          "2026-05",
          definition.ClassificationCode,
          definition.ClassificationLabel
            ?? definition.ClassificationCode,
          definition.IsEdited
            ? ClassificationOrigin.Manual
            : ClassificationOrigin.Analysis),
      AllergenAssessment = CreateAllergenAssessment(definition.AllergenState),
      Metadata = new ProductMetadata
      {
        IsEdited = definition.IsEdited,
        IsComplete = definition.ClassificationCode is not null,
        Confidence = definition.ClassificationCode is null ? 0 : 0.91,
      },
    };

  private static StandardClassification CreateClassification(
    ClassificationSystem system,
    string version,
    string code,
    string label,
    ClassificationOrigin origin) =>
    new(
      system,
      version,
      code,
      label,
      [new ClassificationNode("leaf", code, label)],
      origin,
      origin == ClassificationOrigin.Analysis ? 0.91 : null,
      origin == ClassificationOrigin.Analysis
        ? [new ClassificationEvidence("seed.fixture", label)]
        : []);

  private static AllergenAssessment? CreateAllergenAssessment(string state) =>
    state.ToLowerInvariant() switch
    {
      "detected" => AllergenAssessment.Detected(
        [
          new AllergenSignal(
            AllergenCode.Milk,
            AllergenEvidenceLevel.Explicit,
            0.95,
            [new AllergenEvidence("seed.fixture", "milk")]),
        ]),
      "none" => AllergenAssessment.NoSignals(),
      "insufficient" => AllergenAssessment.Insufficient(),
      "unassessed" => null,
      _ => throw new InvalidDataException(
        $"Unsupported allergen seed state '{state}'."),
    };

  private static RecipeSuggestion CreateRecipe(SeedInvoiceDefinition invoice) =>
    new(
      $"{invoice.Name} bowl",
      "A deterministic local development recipe.",
      servings: 2,
      preparationMinutes: 5,
      cookingMinutes: 10,
      totalMinutes: 15,
      RecipeDifficulty.Easy,
      invoice.Products.Count == 0
        ? []
        : [new RecipeIngredient(invoice.Products[0].Name, "1 portion", null)],
      [new RecipeIngredient("Water", "250 ml", null)],
      [],
      [new RecipeStep(1, "Combine the ingredients and cook gently.", null)],
      []);

  private static Currency CreateCurrency(string code) =>
    code.ToUpperInvariant() switch
    {
      "RON" => new Currency("Romanian Leu", "RON", "lei"),
      "EUR" => new Currency("Euro", "EUR", "€"),
      _ => throw new InvalidDataException($"Unsupported seed currency '{code}'."),
    };

  private static PaymentType ParsePaymentType(string value) =>
    string.Equals(value, "SPLIT", StringComparison.OrdinalIgnoreCase)
      ? PaymentType.Other
      : Enum.TryParse(value, ignoreCase: true, out PaymentType paymentType)
      && Enum.IsDefined(paymentType)
        ? paymentType
        : throw new InvalidDataException(
          $"Unsupported seed payment type '{value}'.");

  private static List<PaymentDetail> CreatePayments(
    SeedInvoiceDefinition definition) =>
    string.Equals(
      definition.PaymentType,
      "SPLIT",
      StringComparison.OrdinalIgnoreCase)
      ?
      [
        new PaymentDetail
        {
          Method = "Cash",
          Amount = decimal.Round(definition.TotalAmount / 2, 2),
        },
        new PaymentDetail
        {
          Method = "Card",
          Amount = definition.TotalAmount
            - decimal.Round(definition.TotalAmount / 2, 2),
        },
      ]
      :
      [
        new PaymentDetail
        {
          Method = definition.PaymentType,
          Amount = definition.TotalAmount,
        },
      ];

  private static DateTimeOffset ResolveDate(
    DateOnly anchor,
    int daysAgo) =>
    new(anchor.AddDays(-daysAgo), TimeOnly.MinValue, TimeSpan.Zero);
}
