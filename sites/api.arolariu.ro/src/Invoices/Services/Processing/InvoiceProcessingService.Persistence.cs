namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class InvoiceProcessingService
{
  private const string InvariantNumberFormat = "0.############################";

  /// <inheritdoc/>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "A persistence failure after analysis must be surfaced so the management layer can fail the durable run explicitly.")]
  public async Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(
    InvoiceAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistInvoiceAnalysisAsync));
      ArgumentNullException.ThrowIfNull(executionResult);

      AnalysisQueueMessage message = executionResult.Message;
      Invoice invoice = await invoiceOrchestrationService
        .ReadInvoiceObject(
          message.TargetId,
          message.TargetPartitionIdentifier ?? message.RequestedBy,
          cancellationToken)
        .ConfigureAwait(false);

      ArgumentNullException.ThrowIfNull(invoice);

      InvoiceAnalysisPatch patch = executionResult.TargetPatch;

      ApplyInvoicePatch(invoice, patch, message.CorrelationId);
      activity?.SetTag("analysis.patch_has_changes", patch.HasChanges);

      await invoiceOrchestrationService
        .UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, cancellationToken)
        .ConfigureAwait(false);

      return executionResult;
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(
    MerchantAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistMerchantAnalysisAsync));
      ArgumentNullException.ThrowIfNull(executionResult);

      AnalysisQueueMessage message = executionResult.Message;
      Merchant merchant = await merchantOrchestrationService
        .ReadMerchantObject(message.TargetId, message.TargetPartitionIdentifier, cancellationToken)
        .ConfigureAwait(false);

      ArgumentNullException.ThrowIfNull(merchant);
      ApplyMerchantPatch(merchant, executionResult.TargetPatch);
      activity?.SetTag("analysis.patch_has_changes", executionResult.TargetPatch.HasChanges);

      await merchantOrchestrationService
        .UpdateMerchantObject(
          merchant,
          merchant.id,
          message.TargetPartitionIdentifier,
          cancellationToken)
        .ConfigureAwait(false);

      return executionResult;
    }).ConfigureAwait(false);

  private static void ApplyInvoicePatch(Invoice invoice, InvoiceAnalysisPatch patch, Guid sourceRunId)
  {
    if (patch.ExtractionUpdate is not null)
    {
      ApplyExtraction(invoice, patch.ExtractionUpdate);
    }

    if (patch.SummaryUpdate is not null)
    {
      invoice.Name = patch.SummaryUpdate.Name;
      invoice.Description = patch.SummaryUpdate.Description;
    }

    if (patch.ProductClassificationUpdate is not null)
    {
      ApplyProductClassifications(invoice, patch.ProductClassificationUpdate);
    }

    if (patch.AllergenAssessmentUpdate is not null)
    {
      ApplyAllergenAssessments(invoice, patch.AllergenAssessmentUpdate, sourceRunId);
    }

    if (patch.InvoiceClassificationUpdate is not null)
    {
      invoice.Classification = patch.InvoiceClassificationUpdate.Classification;
    }

    if (patch.RecipeGenerationUpdate is not null)
    {
      invoice.PossibleRecipes = [.. patch.RecipeGenerationUpdate.Recipes];
    }
  }

  private static void ApplyMerchantPatch(Merchant merchant, MerchantAnalysisPatch patch)
  {
    if (patch.ClassificationUpdate is not null)
    {
      merchant.Classification = patch.ClassificationUpdate.Classification;
    }

    if (patch.DescriptionUpdate is not null)
    {
      merchant.Description = patch.DescriptionUpdate.Description;
    }
  }

  private static List<Product> ReconcileExtractedProducts(
    IEnumerable<Product>? previousItems,
    IReadOnlyList<ExtractedProduct> extractedProducts)
  {
    ArgumentNullException.ThrowIfNull(extractedProducts);

    ProductCarryOverIndex carryOver = ProductCarryOverIndex.Build(previousItems);
    var reconciled = new List<Product>(extractedProducts.Count);

    foreach (ExtractedProduct extracted in extractedProducts)
    {
      Product product = ExtractedProductMapper.ToDomainProduct(extracted);
      Product? previous = carryOver.TryTake(product);

      if (previous is not null)
      {
        product.Classification = previous.Classification;
        product.AllergenAssessment = previous.AllergenAssessment;

        ProductMetadata metadata = previous.Metadata;
        metadata.Confidence = product.Metadata.Confidence;
        product.Metadata = metadata;
      }

      reconciled.Add(product);
    }

    return reconciled;
  }

  private static string? BuildProductCodeKey(string? productCode) =>
    string.IsNullOrWhiteSpace(productCode) ? null : productCode.Trim().ToUpperInvariant();

  private static string BuildProductAttributeKey(Product product) => string.Concat(
    NormalizeProductName(product.Name),
    "|",
    product.Quantity.ToString(InvariantNumberFormat, CultureInfo.InvariantCulture),
    "|",
    product.Price.ToString(InvariantNumberFormat, CultureInfo.InvariantCulture));

  private static string NormalizeProductName(string? name) =>
    string.IsNullOrWhiteSpace(name)
      ? string.Empty
      : string.Join(
          ' ',
          name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        .ToUpperInvariant();

  private sealed class ProductCarryOverIndex
  {
    private readonly Dictionary<string, Queue<ProductCarryOverEntry>> byProductCode = new(StringComparer.Ordinal);
    private readonly Dictionary<string, Queue<ProductCarryOverEntry>> byAttributes = new(StringComparer.Ordinal);

    internal static ProductCarryOverIndex Build(IEnumerable<Product>? previousItems)
    {
      var index = new ProductCarryOverIndex();

      if (previousItems is null)
      {
        return index;
      }

      foreach (Product previous in previousItems)
      {
        if (previous is null)
        {
          continue;
        }

        var entry = new ProductCarryOverEntry(previous);
        string? productCodeKey = BuildProductCodeKey(previous.ProductCode);

        if (productCodeKey is not null)
        {
          Enqueue(index.byProductCode, productCodeKey, entry);
        }

        Enqueue(index.byAttributes, BuildProductAttributeKey(previous), entry);
      }

      return index;
    }

    internal Product? TryTake(Product candidate)
    {
      string? productCodeKey = BuildProductCodeKey(candidate.ProductCode);

      if (productCodeKey is not null && TryDequeue(byProductCode, productCodeKey, out Product? byCode))
      {
        return byCode;
      }

      return TryDequeue(byAttributes, BuildProductAttributeKey(candidate), out Product? byAttribute)
        ? byAttribute
        : null;
    }

    private static void Enqueue(
      Dictionary<string, Queue<ProductCarryOverEntry>> index,
      string key,
      ProductCarryOverEntry entry)
    {
      if (!index.TryGetValue(key, out Queue<ProductCarryOverEntry>? queue))
      {
        queue = new Queue<ProductCarryOverEntry>();
        index[key] = queue;
      }

      queue.Enqueue(entry);
    }

    private static bool TryDequeue(
      Dictionary<string, Queue<ProductCarryOverEntry>> index,
      string key,
      out Product? matched)
    {
      matched = null;

      if (!index.TryGetValue(key, out Queue<ProductCarryOverEntry>? queue))
      {
        return false;
      }

      while (queue.Count > 0)
      {
        ProductCarryOverEntry entry = queue.Dequeue();

        if (entry.Consumed)
        {
          continue;
        }

        entry.Consumed = true;
        matched = entry.Product;
        return true;
      }

      return false;
    }
  }

  private sealed class ProductCarryOverEntry(Product product)
  {
    internal Product Product { get; } = product;

    internal bool Consumed { get; set; }
  }

  private static void ApplyExtraction(Invoice invoice, ReceiptExtractionResult extraction)
  {
    invoice.Items = ReconcileExtractedProducts(invoice.Items, extraction.Products);
    invoice.PaymentInformation = extraction.PaymentInformation;
    invoice.ReceiptType = extraction.ReceiptType;
    invoice.CountryRegion = extraction.CountryRegion;
    invoice.TaxDetails = [.. extraction.TaxDetails];
    invoice.Payments = [.. extraction.Payments];
  }

  private static void ApplyProductClassifications(Invoice invoice, ProductClassificationResult classifications)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      string token = AnalysisCorrelationTokens.ForProduct(index);

      if (classifications.Classifications.TryGetValue(token, out StandardClassification? classification))
      {
        items[index].Classification = classification;
      }
    }
  }

  private static void ApplyAllergenAssessments(
    Invoice invoice,
    ProductAllergenAssessmentResult assessments,
    Guid sourceRunId)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      string token = AnalysisCorrelationTokens.ForProduct(index);

      if (assessments.Assessments.TryGetValue(token, out ProductAllergenAssessment? assessment))
      {
        items[index].AllergenAssessment = ToPersistedAssessment(assessment, sourceRunId);
      }
    }
  }

  private static AllergenAssessment ToPersistedAssessment(ProductAllergenAssessment assessment, Guid sourceRunId) =>
    assessment.Status switch
    {
      ProductAllergenAssessmentStatus.SignalsFound => AllergenAssessment.Detected(
        sourceRunId,
        [.. assessment.Signals.Select(ToPersistedSignal)]),
      ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence => AllergenAssessment.NoSignals(sourceRunId),
      _ => AllergenAssessment.Insufficient(sourceRunId),
    };

  private static AllergenSignal ToPersistedSignal(ProductAllergenSignal signal) => new(
    signal.Code,
    ToEvidenceLevel(signal.EvidenceTier),
    signal.Confidence,
    signal.Evidence);

  private static AllergenEvidenceLevel ToEvidenceLevel(ProductAllergenEvidenceTier tier) => tier switch
  {
    ProductAllergenEvidenceTier.Declared => AllergenEvidenceLevel.Explicit,
    ProductAllergenEvidenceTier.Likely => AllergenEvidenceLevel.Inferred,
    _ => AllergenEvidenceLevel.Precautionary,
  };

}
