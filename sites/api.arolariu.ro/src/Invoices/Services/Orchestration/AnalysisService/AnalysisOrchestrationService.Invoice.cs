namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisOrchestrationService
{
  /// <inheritdoc/>
  /// <remarks>
  /// <para><b>DAG:</b> (1) document extraction; (2) deterministic transient product wrappers built from the
  /// extraction result; (3) invoice summary and product classification run concurrently; (4) allergen assessment
  /// runs after product classification; (5) invoice classification runs after product classification; (6) recipe
  /// generation runs after both product classification and the allergen assessment outcome are available.</para>
  /// <para>The returned <see cref="InvoiceAnalysisResult.MerchantCandidateResult"/> is the transient candidate
  /// observed during extraction only — resolving or creating the durable merchant aggregate remains a later
  /// processing-layer responsibility and is never attempted here.</para>
  /// </remarks>
  public async Task<InvoiceAnalysisResult> AnalyzeInvoiceAsync(
    AnalysisRun run,
    Invoice invoice,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(run);
    ArgumentNullException.ThrowIfNull(invoice);

    InvoiceAnalysisOptions options = run.InvoiceOptions
      ?? throw new ArgumentException("The supplied analysis run does not carry invoice analysis options.", nameof(run));

    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync));

    var completedCapabilities = new ConcurrentQueue<AnalysisCapability>();

    ReceiptExtractionResult? extractionResult = null;
    if (options.DocumentExtraction)
    {
      var scans = new List<InvoiceScan>(invoice.Scans);
      extractionResult = await ExecuteBestEffortAsync(
        AnalysisCapability.DocumentExtraction,
        () => documentAnalysisFoundationService.ExtractInvoiceAsync(scans, cancellationToken),
        completedCapabilities).ConfigureAwait(false);
    }

    MerchantCandidate? merchantCandidateResult = options.MerchantResolution
      ? extractionResult?.MerchantCandidate
      : null;

    List<ProductAnalysisInput> products = BuildProductAnalysisInputs(extractionResult);

    // Step 3: invoice summary and product classification are independent of each other and are started
    // before either is awaited, so they execute concurrently.
    Task<InvoiceSummaryResult?>? summaryTask = options.InvoiceSummary && products.Count > 0
      ? ExecuteBestEffortAsync(
          AnalysisCapability.InvoiceSummary,
          () => generativeAnalysisFoundationService.GenerateInvoiceSummaryAsync(products, run.Id, cancellationToken),
          completedCapabilities)
      : null;

    Task<ProductClassificationResult?>? classificationTask = options.ProductClassification && products.Count > 0
      ? ExecuteBestEffortAsync(
          AnalysisCapability.ProductClassification,
          () => generativeAnalysisFoundationService.ClassifyProductsAsync(products, cancellationToken),
          completedCapabilities)
      : null;

    InvoiceSummaryResult? summaryResult = summaryTask is null
      ? null
      : await summaryTask.ConfigureAwait(false);

    ProductClassificationResult? productClassificationResult = classificationTask is null
      ? null
      : await classificationTask.ConfigureAwait(false);

    // Step 4: allergen assessment requires resolved product classifications.
    ProductAllergenAssessmentResult? allergenAssessmentResult = null;
    if (options.AllergenAssessment && productClassificationResult is not null)
    {
      allergenAssessmentResult = await ExecuteBestEffortAsync(
        AnalysisCapability.AllergenAssessment,
        () => generativeAnalysisFoundationService.AssessAllergensAsync(products, productClassificationResult, run.Id, cancellationToken),
        completedCapabilities).ConfigureAwait(false);
    }

    // Step 5: invoice classification requires both the merged extraction result and resolved product classifications.
    InvoiceClassificationResult? invoiceClassificationResult = null;
    if (options.InvoiceClassification && extractionResult is not null && productClassificationResult is not null)
    {
      invoiceClassificationResult = await ExecuteBestEffortAsync(
        AnalysisCapability.InvoiceClassification,
        () => generativeAnalysisFoundationService.ClassifyInvoiceAsync(extractionResult, productClassificationResult, run.Id, cancellationToken),
        completedCapabilities).ConfigureAwait(false);
    }

    // Step 6: recipe generation requires both resolved product classifications and the allergen assessment outcome.
    RecipeGenerationResult? recipeGenerationResult = null;
    if (options.RecipeGeneration
      && options.MaximumRecipes > 0
      && productClassificationResult is not null
      && allergenAssessmentResult is not null)
    {
      recipeGenerationResult = await ExecuteBestEffortAsync(
        AnalysisCapability.RecipeGeneration,
        () => generativeAnalysisFoundationService.GenerateRecipesAsync(
          products,
          productClassificationResult,
          allergenAssessmentResult,
          options.MaximumRecipes,
          run.Id,
          cancellationToken),
        completedCapabilities).ConfigureAwait(false);
    }

    return new InvoiceAnalysisResult(
      extractionResult,
      merchantCandidateResult,
      summaryResult,
      productClassificationResult,
      allergenAssessmentResult,
      invoiceClassificationResult,
      recipeGenerationResult,
      completedCapabilities.ToArray());
  }

  private static List<ProductAnalysisInput> BuildProductAnalysisInputs(ReceiptExtractionResult? extractionResult)
  {
    if (extractionResult is null || extractionResult.Products.Count == 0)
    {
      return [];
    }

    var inputs = new List<ProductAnalysisInput>(extractionResult.Products.Count);

    for (int index = 0; index < extractionResult.Products.Count; index++)
    {
      ExtractedProduct extracted = extractionResult.Products[index];
      string correlationToken = $"product-{index:D4}";
      Product product = ToDomainProduct(extracted);
      inputs.Add(new ProductAnalysisInput(correlationToken, product));
    }

    return inputs;
  }

  private static Product ToDomainProduct(ExtractedProduct extracted) =>
    new()
    {
      Name = extracted.Name,
      Quantity = extracted.Quantity,
      QuantityUnit = extracted.QuantityUnit,
      ProductCode = extracted.ProductCode,
      Price = extracted.Price,
      Metadata = new ProductMetadata { Confidence = extracted.Confidence },
    };
}
