namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Defines queue lifecycle and non-classification analysis capability coordination.
/// </summary>
public interface IAnalysisOrchestrationService
{
  /// <summary>Executes the selected invoice analysis workflow without persistence.</summary>
  Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
    Invoice invoice,
    CancellationToken cancellationToken);

  /// <summary>Executes the selected merchant analysis workflow without persistence.</summary>
  Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    Merchant merchant,
    CancellationToken cancellationToken);

  /// <summary>Canonically resolves one optional manual classification selection.</summary>
  Task<StandardClassification?> ResolveManualClassificationAsync(
    StandardClassification? classification,
    ClassificationSystem expectedSystem,
    CancellationToken cancellationToken);

  /// <summary>Classifies transient products against GS1 GPC.</summary>
  Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken);

  /// <summary>Classifies an invoice against ECOICOP v2.</summary>
  Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>Classifies a merchant against NACE 2.1.</summary>
  Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>Ensures the backend-owned analysis queue exists.</summary>
  Task EnsureQueueAsync(CancellationToken cancellationToken);

  /// <summary>Enqueues one analysis message and returns Azure Queue's message identifier.</summary>
  Task<string> EnqueueAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis message.</summary>
  Task<AnalysisQueueReceipt?> ReceiveAnalysisAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Renews one received analysis message's visibility timeout.</summary>
  Task<AnalysisQueueReceipt> RenewAnalysisVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed analysis message.</summary>
  Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);

  /// <summary>Extracts typed receipt data from invoice scans.</summary>
  Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);

  /// <summary>Generates an invoice summary.</summary>
  Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Assesses allergens for classified products.</summary>
  Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Generates recipe suggestions.</summary>
  Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Generates a merchant description.</summary>
  Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid correlationId,
    CancellationToken cancellationToken);
}
