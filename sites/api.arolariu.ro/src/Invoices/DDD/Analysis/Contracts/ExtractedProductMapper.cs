namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

/// <summary>
/// The single projection from a transient <see cref="ExtractedProduct"/> onto the persisted <see cref="Product"/>
/// value object.
/// </summary>
/// <remarks>
/// <para><b>Why this exists:</b> The analysis orchestration layer builds transient product wrappers for the
/// generative capabilities, and the analysis processing layer writes extracted line items onto the durable invoice
/// aggregate. Both need the exact same projection. Keeping two hand-rolled copies allowed them to drift - the
/// persistence-side copy silently dropped <see cref="ExtractedProduct.Confidence"/>, so document-intelligence OCR
/// confidence never reached storage. This type is the one authoritative mapper both layers call.</para>
/// <para><b>Deliberately excluded:</b> Analysis artifacts (<see cref="Product.Classification"/>,
/// <see cref="Product.AllergenAssessment"/>) and user workflow flags are NOT set here. Extraction knows nothing
/// about them; carrying prior values forward is a separate, explicit processing-layer concern.</para>
/// </remarks>
internal static class ExtractedProductMapper
{
  /// <summary>
  /// Projects a transient extracted product onto a fresh persisted product value object.
  /// </summary>
  /// <param name="extracted">The transient product produced by document extraction.</param>
  /// <returns>A new <see cref="Product"/> carrying the extracted fields and the extraction's OCR confidence.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="extracted"/> is null.</exception>
  internal static Product ToDomainProduct(ExtractedProduct extracted)
  {
    ArgumentNullException.ThrowIfNull(extracted);

    return new Product
    {
      Name = extracted.Name,
      Quantity = extracted.Quantity,
      QuantityUnit = extracted.QuantityUnit,
      ProductCode = extracted.ProductCode,
      Price = extracted.Price,
      Metadata = new ProductMetadata { Confidence = extracted.Confidence },
    };
  }
}
