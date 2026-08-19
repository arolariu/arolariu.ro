namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.ClassificationService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Defines the orchestration boundary for manual and AI-assisted canonical classification workflows.
/// </summary>
public interface IClassificationOrchestrationService
{
  /// <summary>
  /// Canonically resolves one optional manual classification selection.
  /// </summary>
  Task<StandardClassification?> ResolveManualClassificationAsync(
    StandardClassification? classification,
    ClassificationSystem expectedSystem,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies a batch of transient products against GS1 GPC.
  /// </summary>
  Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies an invoice against ECOICOP v2.
  /// </summary>
  Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>
  /// Classifies a merchant against NACE 2.1.
  /// </summary>
  Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);
}
