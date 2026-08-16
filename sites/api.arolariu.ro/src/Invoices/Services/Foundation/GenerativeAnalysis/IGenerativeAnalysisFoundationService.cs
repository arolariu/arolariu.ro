namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Defines the reusable structured classification engine that resolves canonical standard classifications for
/// products, invoices, and merchants using generative AI search-term generation and candidate-code selection.
/// </summary>
/// <remarks>
/// <para>
/// Implementations MUST batch all requested subjects into single structured generation calls per phase, preserve
/// exactly one result per transient correlation token, and resolve every AI-selected code through the canonical
/// taxonomy broker before returning it. Implementations MUST NOT persist aggregates, produce invoice summaries,
/// detect allergens, suggest recipes, or generate merchant descriptions.
/// </para>
/// <para><b>Taxonomy mapping:</b> Products classify against GS1 GPC, invoices against ECOICOP v2, and merchants
/// against NACE 2.1.</para>
/// </remarks>
public interface IGenerativeAnalysisFoundationService
{
  /// <summary>
  /// Classifies a batch of transient products against the GS1 Global Product Classification (GPC) taxonomy.
  /// </summary>
  /// <param name="products">The transient product analysis inputs to classify.</param>
  /// <param name="cancellationToken">The cancellation token that aborts classification.</param>
  /// <returns>The canonical GPC classifications keyed by transient correlation token.</returns>
  Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies a typed receipt extraction against the ECOICOP v2 taxonomy.
  /// </summary>
  /// <param name="extraction">The merged typed receipt extraction result for the analysis run.</param>
  /// <param name="products">The previously resolved product classifications for the same analysis run.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this classification request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts classification.</param>
  /// <returns>The canonical ECOICOP v2 classification for the invoice.</returns>
  Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies a merchant against the NACE 2.1 taxonomy.
  /// </summary>
  /// <param name="merchant">The merchant to classify.</param>
  /// <param name="sourceRunId">The analysis run identifier that originated this classification request.</param>
  /// <param name="cancellationToken">The cancellation token that aborts classification.</param>
  /// <returns>The canonical NACE 2.1 classification for the merchant.</returns>
  Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);
}
