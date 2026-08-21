namespace LocalDevelopment.Bootstrap;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Identifiers shared by the development identity and seed-data contracts.
/// </summary>
internal static class PersonaIds
{
  internal static readonly Guid Alice = Guid.Parse("7574070c-3ee9-5031-9b1b-0dc08c61ee86");
  internal static readonly Guid Bob = Guid.Parse("6a40503e-c1af-51b0-8b60-3c6648b3724e");
  internal static readonly Guid Charlie = Guid.Parse("fc687d5c-39d5-5541-868c-f76a3fdbd4e4");
}

/// <summary>
/// Root logical fixture loaded by the local development bootstrap.
/// </summary>
internal sealed record SeedScenarioManifest(
  string Version,
  IReadOnlyList<SeedPersonaDefinition> Personas,
  IReadOnlyList<SeedMerchantDefinition> Merchants,
  IReadOnlyList<SeedInvoiceDefinition> Invoices,
  IReadOnlyList<SeedBlobDefinition> Blobs);

internal sealed record SeedPersonaDefinition(
  string Key,
  string Subject,
  Guid UserIdentifier);

internal sealed record SeedMerchantDefinition(
  string Key,
  Guid Id,
  string OwnerKey,
  string Name,
  string Description,
  Guid ParentCompanyId,
  string ClassificationCode,
  string ClassificationLabel);

internal sealed record SeedInvoiceDefinition(
  string Key,
  Guid Id,
  string OwnerKey,
  string Name,
  string Description,
  int DaysAgo,
  string MerchantKey,
  IReadOnlyList<string> SharedWith,
  string CurrencyCode,
  string PaymentType,
  decimal TotalAmount,
  decimal TaxAmount,
  bool IsImportant,
  bool IsSoftDeleted,
  string? ClassificationCode,
  string? ClassificationLabel,
  IReadOnlyList<SeedProductDefinition> Products,
  bool IncludeRecipe,
  string? BlobKey);

internal sealed record SeedProductDefinition(
  string Name,
  decimal Quantity,
  string QuantityUnit,
  string ProductCode,
  decimal Price,
  string? ClassificationCode,
  string? ClassificationLabel,
  string AllergenState,
  bool IsEdited);

internal sealed record SeedBlobDefinition(
  string Key,
  string ContentType,
  string ContentBase64);

internal sealed record MaterializedSeedBlob(
  string Key,
  string ContentType,
  byte[] Content);

internal sealed record MaterializedSeedScenario(
  IReadOnlyList<Merchant> Merchants,
  IReadOnlyList<Invoice> Invoices,
  IReadOnlyList<MaterializedSeedBlob> Blobs);
