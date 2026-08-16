namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

public sealed partial class GenerativeAnalysisFoundationService
{
  private static void ValidateProductsAreSet(IReadOnlyList<ProductAnalysisInput> products)
  {
    ArgumentNullException.ThrowIfNull(products);

    if (products.Count == 0)
    {
      throw new ArgumentException("At least one product is required for GPC classification.", nameof(products));
    }

    ValidateCorrelationTokensAreUnique(products.Select(product => product.CorrelationToken));
  }

  private static void ValidateExtractionIsSet(ReceiptExtractionResult extraction) =>
    ArgumentNullException.ThrowIfNull(extraction);

  private static void ValidateProductClassificationResultIsSet(ProductClassificationResult products) =>
    ArgumentNullException.ThrowIfNull(products);

  private static void ValidateMerchantIsSet(Merchant merchant) =>
    ArgumentNullException.ThrowIfNull(merchant);

  private static void ValidateSourceRunId(Guid sourceRunId, string parameterName)
  {
    if (sourceRunId == Guid.Empty)
    {
      throw new ArgumentException("Source run identifier must not be the empty guid.", parameterName);
    }
  }

  private static void ValidateCorrelationTokensAreUnique(IEnumerable<string> correlationTokens)
  {
    var seenTokens = new HashSet<string>(StringComparer.Ordinal);

    foreach (string correlationToken in correlationTokens)
    {
      if (!seenTokens.Add(correlationToken))
      {
        throw new ArgumentException(
          $"Duplicate correlation token '{correlationToken}' is not permitted within a single classification batch.",
          nameof(correlationTokens));
      }
    }
  }
}
