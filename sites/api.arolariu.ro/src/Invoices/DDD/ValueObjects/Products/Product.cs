namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products.Exceptions;

using Microsoft.EntityFrameworkCore;

/// <summary>
/// Represents a single invoice line item (product) enriched via OCR and AI classification pipelines.
/// </summary>
/// <remarks>
/// <para>Encapsulates product name (<c>Name</c>), standardised classification
/// (<c>Classification</c>), quantitative details (<c>Quantity</c>, <c>QuantityUnit</c>), commercial identifiers (<c>ProductCode</c>), pricing
/// (<c>Price</c>, computed <c>TotalPrice</c>) and analysis artifacts (<c>AllergenAssessment</c>, <c>Metadata</c>).</para>
/// <para><b>Identity:</b> This value object is deliberately identity-free. Line items are correlated to analysis results
/// positionally, by their ordinal within the owning invoice.</para>
/// <para><b>Lifecycle:</b> Instances are owned by the containing invoice aggregate and are persisted as embedded documents
/// (Cosmos owned collection). They SHOULD NOT be shared across invoice aggregates.</para>
/// <para><b>Analysis:</b> <c>Classification</c> and <c>AllergenAssessment</c> are progressively enriched; both are
/// <see langword="null"/> until an analysis run or a manual selection populates them.</para>
/// <para><b>Thread-safety:</b> Not thread-safe; mutate only within the aggregate's modification workflow.</para>
/// </remarks>
[Owned]
public class Product
{
  private const int MaximumNameLength = 256;
  private const int MaximumQuantityUnitLength = 32;
  private const int MaximumProductCodeLength = 128;
  private const int MaximumClassificationCodeLength = 64;

  /// <summary>The name of the product as extracted from the invoice via OCR.</summary>
  /// <remarks><para>Used for display, aggregation, allergen inference heuristics and recipe matching. May be empty prior to enrichment.</para></remarks>
  [JsonPropertyOrder(0)]
  public string Name { get; set; } = string.Empty;

  /// <summary>Standardised classification assigned to this product.</summary>
  /// <remarks>
  /// <para><b>Expected system:</b> <see cref="ClassificationSystem.Gs1Gpc"/>. Storage foundations reject any other system.</para>
  /// <para><see langword="null"/> means the line item has not been classified yet.</para>
  /// </remarks>
  [JsonPropertyOrder(1)]
  public StandardClassification? Classification { get; set; }

  /// <summary>Quantity of the product associated with the unit indicated by <see cref="QuantityUnit"/>.</summary>
  /// <remarks><para>Must be non-negative. Zero often indicates an OCR failure and SHOULD be corrected upstream.</para></remarks>
  [JsonPropertyOrder(2)]
  public decimal Quantity { get; set; } = 0;

  /// <summary>Unit of measure for <see cref="Quantity"/> (e.g. "kg", "ml", "pcs").</summary>
  /// <remarks><para>Empty string denotes unspecified unit; downstream analytics may treat such entries as unit-less discrete counts.</para></remarks>
  [JsonPropertyOrder(3)]
  public string QuantityUnit { get; set; } = string.Empty;

  /// <summary>Optional SKU / barcode / internal product identifier.</summary>
  /// <remarks><para>Used for deterministic normalization where available. May be empty if not captured by OCR or invoice source.</para></remarks>
  [JsonPropertyOrder(4)]
  public string ProductCode { get; set; } = string.Empty;

  /// <summary>Unit price expressed in the parent invoice’s currency.</summary>
  /// <remarks>
  /// <para>Represents the effective per-unit value (post-discount if already applied upstream). Non-negative decimal. Range pricing or “per unit” expressions
  /// (e.g. “1.99 / kg”) are normalized prior to persistence; variability / ambiguity SHOULD be resolved in enrichment pipeline.</para>
  /// </remarks>
  [JsonPropertyOrder(5)]
  public decimal Price { get; set; } = 0;

  /// <summary>Computed extended line total (= <c>Quantity * Price</c>).</summary>
  /// <value>Zero when either quantity or price not yet enriched.</value>
  [JsonIgnore]
  public decimal TotalPrice => Quantity * Price;

  /// <summary>The structured allergen assessment produced for this product by an analysis run.</summary>
  /// <remarks>
  /// <para><see langword="null"/> means no allergen assessment has been produced yet. An assessment carries its own
  /// status (detected / no signals / insufficient data) so an empty signal list is never ambiguous.</para>
  /// </remarks>
  [JsonPropertyOrder(6)]
  public AllergenAssessment? AllergenAssessment { get; set; }

  /// <summary>Mutable operational metadata (editing state, completion state, soft delete flag).</summary>
  /// <remarks><para>Soft-deleted products remain embedded for audit; parent invoice filters them out at presentation layers.</para></remarks>
  [JsonPropertyOrder(7)]
  public ProductMetadata Metadata { get; set; }

  /// <summary>
  /// Gets or sets whether this transient product instance originated from a client commercial request.
  /// </summary>
  /// <remarks>
  /// The marker is not serialized or persisted. It lets the aggregate write boundary re-check the strict commercial
  /// invariants enforced by client DTOs without retroactively rejecting incomplete OCR evidence that remains eligible
  /// for later enrichment.
  /// </remarks>
  [JsonIgnore]
  internal bool RequiresCommercialValidation { get; set; }

  /// <summary>
  /// Validates client-editable commercial invariants before the product enters an aggregate write path.
  /// </summary>
  /// <remarks>
  /// <para>
  /// The validation is intentionally side-effect free. <see cref="TotalPrice"/> is derived rather than supplied,
  /// so the checked multiplication guards against a decimal overflow and proves the stored commercial inputs can
  /// produce the domain line total.
  /// </para>
  /// <para>
  /// Classification, allergen evidence, and workflow state remain server-owned. A supplied classification is allowed
  /// only when it is a nonblank GS1 GPC selector; storage canonicalizes that selector before persistence.
  /// </para>
  /// </remarks>
  /// <exception cref="ProductValidationException">
  /// Thrown when the product has an invalid name, quantity, unit, code, price, classification, metadata confidence,
  /// or non-representable total price.
  /// </exception>
  public void ValidateForPersistence()
  {
    if (string.IsNullOrWhiteSpace(Name)
      || Name.Length > MaximumNameLength
      || Name != Name.Trim())
    {
      throw new ProductValidationException("Product name must be nonblank, trimmed, and at most 256 characters.");
    }

    if (Quantity <= decimal.Zero)
    {
      throw new ProductValidationException("Product quantity must be positive.");
    }

    if (!HasValidQuantityUnit(QuantityUnit))
    {
      throw new ProductValidationException(
        "Product quantity unit must be a nonblank unit identifier of at most 32 characters.");
    }

    if (Price < decimal.Zero)
    {
      throw new ProductValidationException("Product unit price must be nonnegative.");
    }

    if (!HasValidProductCode(ProductCode))
    {
      throw new ProductValidationException(
        "Product code must be empty or a safe identifier of at most 128 characters.");
    }

    if (Classification is not null
      && (Classification.System != ClassificationSystem.Gs1Gpc
        || string.IsNullOrWhiteSpace(Classification.Code)
        || Classification.Code.Length > MaximumClassificationCodeLength))
    {
      throw new ProductValidationException(
        "Product classification must be a GS1 GPC selection with a nonblank code of at most 64 characters.");
    }

    if (!double.IsFinite(Metadata.Confidence)
      || Metadata.Confidence is < 0.0 or > 1.0)
    {
      throw new ProductValidationException("Product metadata confidence must be a finite value from zero through one.");
    }

    try
    {
      _ = checked(Quantity * Price);
    }
    catch (OverflowException exception)
    {
      throw new ProductValidationException(
        "Product quantity and unit price exceed the supported total-price range.",
        exception);
    }
  }

  /// <summary>
  /// Applies a client-editable line-item update while preserving analysis and workflow state.
  /// </summary>
  /// <remarks>
  /// <para>
  /// This method mutates the persisted line item selected by its owning invoice aggregate; it never replaces that
  /// instance. As a result, the allergen assessment and operational metadata produced by server workflows remain
  /// intact. The update only changes the client-editable commercial fields and marks the item as edited.
  /// </para>
  /// <para>
  /// A null <see cref="Product.Classification"/> on <paramref name="clientUpdate"/> means that the caller did not
  /// select a replacement classification, so the existing canonical classification (including its evidence and
  /// taxonomy version) is retained. A non-null classification is canonicalized by the invoice storage foundation
  /// before persistence.
  /// </para>
  /// </remarks>
  /// <param name="clientUpdate">The client-controlled product values to apply.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="clientUpdate"/> is null.</exception>
  public void ApplyClientUpdate(Product clientUpdate)
  {
    ArgumentNullException.ThrowIfNull(clientUpdate);

    Name = clientUpdate.Name;
    Quantity = clientUpdate.Quantity;
    QuantityUnit = clientUpdate.QuantityUnit;
    ProductCode = clientUpdate.ProductCode;
    Price = clientUpdate.Price;

    if (clientUpdate.Classification is not null)
    {
      Classification = clientUpdate.Classification;
    }

    ProductMetadata metadata = Metadata;
    metadata.IsEdited = true;
    Metadata = metadata;
    RequiresCommercialValidation = clientUpdate.RequiresCommercialValidation;
  }

  private static bool HasValidQuantityUnit(string? quantityUnit)
  {
    if (string.IsNullOrWhiteSpace(quantityUnit)
      || quantityUnit.Length > MaximumQuantityUnitLength
      || quantityUnit != quantityUnit.Trim())
    {
      return false;
    }

    foreach (char character in quantityUnit)
    {
      if (!char.IsLetter(character)
        && character is not ' ' and not '-' and not '/')
      {
        return false;
      }
    }

    return true;
  }

  private static bool HasValidProductCode(string? productCode)
  {
    if (string.IsNullOrEmpty(productCode))
    {
      return true;
    }

    if (productCode.Length > MaximumProductCodeLength
      || productCode != productCode.Trim())
    {
      return false;
    }

    foreach (char character in productCode)
    {
      if (!char.IsAsciiLetterOrDigit(character)
        && character is not '.' and not '_' and not '-' and not '/')
      {
        return false;
      }
    }

    return true;
  }
}
