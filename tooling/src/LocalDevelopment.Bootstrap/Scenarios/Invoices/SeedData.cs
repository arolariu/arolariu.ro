namespace LocalDevelopment.Bootstrap.Scenarios.Invoices;

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
    RespectRequiredConstructorParameters = true,
    RespectNullableAnnotations = true,
    Converters = { new JsonStringEnumConverter() },
  };

  internal static SeedScenarioManifest LoadScenario(string directoryPath)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(directoryPath);

    if (!Directory.Exists(directoryPath))
    {
      throw new InvalidDataException(
        $"Seed data directory was not found at '{directoryPath}'. Use SEED_DATA_DIRECTORY with the four persona files, not a single manifest.");
    }

    var personas = new List<SeedPersonaDefinition>();
    var merchants = new List<SeedMerchantDefinition>();
    var invoices = new List<SeedInvoiceDefinition>();
    var blobs = new List<SeedBlobDefinition>();
    foreach (string owner in new[] { "alice", "bob", "charlie", "dmitryi" })
    {
      string path = Path.Combine(directoryPath, $"{owner}.json");
      if (!File.Exists(path)) { throw new InvalidDataException($"Required seed file '{path}' was not found."); }
      SeedScenarioManifest part;
      try
      {
        part = JsonSerializer.Deserialize<SeedScenarioManifest>(File.ReadAllText(path), SerializerOptions)
          ?? throw new InvalidDataException($"Seed file '{path}' is empty.");
      }
      catch (Exception exception) when (exception is JsonException or ArgumentException)
      {
        throw new InvalidDataException($"Seed file '{path}' is malformed: {exception.Message}", exception);
      }

      if (part.Version != "v2" || part.Personas.Count != 1 || part.Personas[0] is null || part.Personas[0].Key != owner
          || part.Merchants.Any(merchant => merchant is null || merchant.OwnerKey != owner)
          || part.Invoices.Any(invoice => invoice is null || invoice.OwnerKey != owner))
      {
        throw new InvalidDataException($"Seed file '{path}' must contain version v2 and only its '{owner}' owner.");
      }

      personas.AddRange(part.Personas);
      merchants.AddRange(part.Merchants);
      invoices.AddRange(part.Invoices);
      blobs.AddRange(part.Blobs);
    }

    var manifest = new SeedScenarioManifest("v2", personas, merchants, invoices, blobs);

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
    Dictionary<string, int> oldestInvoiceDays = manifest.Invoices
      .GroupBy(invoice => invoice.MerchantKey, StringComparer.Ordinal)
      .ToDictionary(group => group.Key, group => group.Max(invoice => invoice.DaysAgo), StringComparer.Ordinal);

    List<Merchant> merchants = manifest.Merchants
      .Select(definition => CreateMerchant(
        definition,
        personas[definition.OwnerKey],
        manifest.Version,
        utcAnchorDate,
        oldestInvoiceDays.GetValueOrDefault(definition.Key)))
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
        merchantDefinition,
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
    DateOnly utcAnchorDate,
    int oldestInvoiceDays) =>
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
        definition.ClassificationPath,
        ClassificationOrigin.Analysis),
      Address = new ContactInformation
      {
        FullName = definition.Name,
        Address = $"{definition.StreetAddress}, {definition.City}, {definition.Region}, {definition.CountryCode}",
        EmailAddress = $"{definition.Key.Replace('/', '.')}@example.test",
      },
      CreatedAt = ResolveDate(utcAnchorDate, oldestInvoiceDays + 1),
      CreatedBy = owner.UserIdentifier,
      AdditionalMetadata =
      {
        ["seed.origin"] = SeedOrigin,
        ["seed.version"] = version,
        ["seed.key"] = definition.Key,
        ["seed.country"] = definition.CountryCode,
        ["seed.region"] = definition.Region,
        ["seed.city"] = definition.City,
      },
    };

  private static Invoice CreateInvoice(
    SeedInvoiceDefinition definition,
    SeedPersonaDefinition owner,
    SeedMerchantDefinition merchant,
    Dictionary<string, SeedPersonaDefinition> personas,
    string version,
    DateOnly utcAnchorDate)
  {
    DateTimeOffset transactionDate = ResolveDate(utcAnchorDate, definition.DaysAgo, definition.TransactionTimeUtc);
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
      MerchantReference = merchant.Id,
      Classification = definition.ClassificationCode is null
        ? null
        : CreateClassification(
          ClassificationSystem.EcoicopV2,
          "2",
          definition.ClassificationCode,
          definition.ClassificationLabel
            ?? definition.ClassificationCode,
          definition.ClassificationPath
            ?? throw new InvalidDataException($"Invoice '{definition.Key}' has no classification path."),
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
      PossibleRecipes = definition.Recipe is { } recipe
        ? [CreateRecipe(recipe, definition.Products)]
        : [],
      ReceiptType = "Itemized",
      CountryRegion = merchant.CountryCode,
      TaxDetails = SeedFinancials.CreateTaxDetails(definition.Products),
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
    invoice.AdditionalMetadata["seed.country"] = merchant.CountryCode;
    invoice.AdditionalMetadata["seed.region"] = merchant.Region;
    invoice.AdditionalMetadata["seed.city"] = merchant.City;

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
          definition.ClassificationPath
            ?? throw new InvalidDataException($"Product '{definition.ProductCode}' has no classification path."),
          definition.IsEdited
            ? ClassificationOrigin.Manual
            : ClassificationOrigin.Analysis),
      AllergenAssessment = CreateAllergenAssessment(definition),
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
    IReadOnlyList<ClassificationNode> path,
    ClassificationOrigin origin) =>
    new(
      system,
      version,
      code,
      label,
      path,
      origin,
      origin == ClassificationOrigin.Analysis ? 0.91 : null,
      origin == ClassificationOrigin.Analysis
        ? [new ClassificationEvidence("seed.fixture", label)]
        : []);

  private static AllergenAssessment? CreateAllergenAssessment(SeedProductDefinition definition) =>
    definition.AllergenState.ToLowerInvariant() switch
    {
      "detected" => AllergenAssessment.Detected(
        definition.AllergenCodes.Select(code => new AllergenSignal(
            code,
            AllergenEvidenceLevel.Explicit,
            0.95,
            [new AllergenEvidence("seed.fixture", definition.Name)])).ToArray()),
      "none" => AllergenAssessment.NoSignals(),
      "insufficient" => AllergenAssessment.Insufficient(),
      "unassessed" => null,
      _ => throw new InvalidDataException(
        $"Unsupported allergen seed state '{definition.AllergenState}'."),
    };

  private static RecipeSuggestion CreateRecipe(
    SeedRecipeDefinition recipe,
    IReadOnlyList<SeedProductDefinition> products) =>
    new(
      recipe.Name,
      recipe.Description,
      recipe.Servings,
      recipe.PreparationMinutes,
      recipe.CookingMinutes,
      recipe.PreparationMinutes + recipe.CookingMinutes,
      recipe.Difficulty,
      recipe.PurchasedIngredients.Select(ingredient => new RecipeIngredient(
        products.Single(product => product.ProductCode == ingredient.ProductCode).Name, ingredient.Quantity, null)).ToArray(),
      recipe.PantryIngredients.Select(ingredient => new RecipeIngredient(ingredient.Name, ingredient.Quantity, null)).ToArray(),
      [],
      recipe.Steps.Select((instruction, index) => new RecipeStep(index + 1, instruction, null)).ToArray(),
      products.Where(product => recipe.PurchasedIngredients.Any(ingredient => ingredient.ProductCode == product.ProductCode))
        .SelectMany(product => product.AllergenCodes).Distinct().Order().ToArray());

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
    int daysAgo,
    TimeOnly time = default) =>
    new(anchor.AddDays(-daysAgo), time, TimeSpan.Zero);
}
