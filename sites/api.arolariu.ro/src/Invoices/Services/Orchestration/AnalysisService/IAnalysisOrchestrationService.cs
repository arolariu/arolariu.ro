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
  /// <param name="message">The durable request containing resolved invoice options.</param>
  /// <param name="invoice">The invoice snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable invoice patch, completed capabilities, and optional failure reason.</returns>
  Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
    Invoice invoice,
    CancellationToken cancellationToken);

  /// <summary>Executes the selected merchant analysis workflow without persistence.</summary>
  /// <param name="message">The durable request containing resolved merchant options.</param>
  /// <param name="merchant">The merchant snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel capability execution.</param>
  /// <returns>The immutable merchant patch, completed capabilities, and optional failure reason.</returns>
  Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    Merchant merchant,
    CancellationToken cancellationToken);

  /// <summary>Canonically resolves one optional manual classification selection.</summary>
  /// <param name="classification">The optional code-only classification request.</param>
  /// <param name="expectedSystem">The taxonomy system required by the target field.</param>
  /// <param name="cancellationToken">The token used to cancel taxonomy resolution.</param>
  /// <returns>The canonical taxonomy snapshot, or <see langword="null"/> when no selection was supplied.</returns>
  Task<StandardClassification?> ResolveManualClassificationAsync(
    StandardClassification? classification,
    ClassificationSystem expectedSystem,
    CancellationToken cancellationToken);

  /// <summary>Classifies transient products against GS1 GPC.</summary>
  /// <param name="products">The non-empty product inputs keyed by transient correlation tokens.</param>
  /// <param name="cancellationToken">The token used to cancel classification.</param>
  /// <returns>Canonical GS1 GPC classifications keyed by product token.</returns>
  Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken);

  /// <summary>Classifies an invoice against ECOICOP v2.</summary>
  /// <param name="extraction">The typed receipt extraction used to describe the invoice.</param>
  /// <param name="products">The canonical product classifications used as evidence.</param>
  /// <param name="sourceRunId">The non-empty analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel classification.</param>
  /// <returns>The canonical ECOICOP v2 invoice classification.</returns>
  Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>Classifies a merchant against NACE 2.1.</summary>
  /// <param name="merchant">The merchant snapshot to classify.</param>
  /// <param name="sourceRunId">The non-empty analysis run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel classification.</param>
  /// <returns>The canonical NACE 2.1 merchant classification.</returns>
  Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken);

  /// <summary>Ensures the backend-owned analysis queue exists.</summary>
  /// <param name="cancellationToken">The token used to cancel queue provisioning.</param>
  /// <returns>A task that completes after queue availability is verified.</returns>
  Task EnsureQueueAsync(CancellationToken cancellationToken);

  /// <summary>Enqueues one analysis message and returns Azure Queue's message identifier.</summary>
  /// <param name="message">The provider-neutral durable analysis request.</param>
  /// <param name="cancellationToken">The token used to cancel publication.</param>
  /// <returns>The provider-assigned string message identifier.</returns>
  Task<string> EnqueueAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken);

  /// <summary>Receives at most one visible analysis message.</summary>
  /// <param name="visibilityTimeout">The positive interval for which a dequeued message is hidden.</param>
  /// <param name="cancellationToken">The token used to cancel dequeue.</param>
  /// <returns>The receipt, or <see langword="null"/> when no message is visible.</returns>
  Task<AnalysisQueueReceipt?> ReceiveAnalysisAsync(
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Renews one received analysis message's visibility timeout.</summary>
  /// <param name="receipt">The receipt containing the current provider message ID and pop receipt.</param>
  /// <param name="visibilityTimeout">The positive replacement visibility interval.</param>
  /// <param name="cancellationToken">The token used to cancel renewal.</param>
  /// <returns>The receipt after provider state has been updated.</returns>
  Task<AnalysisQueueReceipt> RenewAnalysisVisibilityAsync(
    AnalysisQueueReceipt receipt,
    TimeSpan visibilityTimeout,
    CancellationToken cancellationToken);

  /// <summary>Deletes one completed or terminally failed analysis message.</summary>
  /// <param name="receipt">The receipt containing the provider message ID and current pop receipt.</param>
  /// <param name="cancellationToken">The token used to cancel deletion.</param>
  /// <returns>A task that completes after deletion.</returns>
  Task DeleteAnalysisAsync(
    AnalysisQueueReceipt receipt,
    CancellationToken cancellationToken);

  /// <summary>Extracts typed receipt data from invoice scans.</summary>
  /// <param name="scans">The ordered invoice scans to extract.</param>
  /// <param name="cancellationToken">The token used to cancel extraction.</param>
  /// <returns>The merged typed receipt extraction.</returns>
  Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken);

  /// <summary>Generates an invoice summary.</summary>
  /// <param name="products">The transient product inputs to summarize.</param>
  /// <param name="correlationId">The durable analysis correlation identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The generated invoice summary.</returns>
  Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Assesses allergens for classified products.</summary>
  /// <param name="products">The transient products to assess.</param>
  /// <param name="classifications">Canonical classifications covering the supplied products.</param>
  /// <param name="correlationId">The durable analysis correlation identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The allergen assessments keyed by product correlation token.</returns>
  Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Generates recipe suggestions.</summary>
  /// <param name="products">The transient products available to recipes.</param>
  /// <param name="classifications">Canonical classifications covering the supplied products.</param>
  /// <param name="allergens">Allergen assessments covering the supplied products.</param>
  /// <param name="maximumRecipes">The requested recipe limit.</param>
  /// <param name="correlationId">The durable analysis correlation identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The bounded recipe suggestions.</returns>
  Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    Guid correlationId,
    CancellationToken cancellationToken);

  /// <summary>Generates a merchant description.</summary>
  /// <param name="merchant">The merchant evidence to describe.</param>
  /// <param name="correlationId">The durable analysis correlation identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The generated merchant description.</returns>
  Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid correlationId,
    CancellationToken cancellationToken);
}
