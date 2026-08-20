namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using System;
using System.Collections.Concurrent;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System.Linq;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

/// <summary>
/// Orchestrates manual and AI-assisted canonical classification workflows.
/// </summary>
public sealed partial class AnalysisOrchestrationService
{
  /// <summary>Delegates typed receipt extraction to the unified analysis foundation.</summary>
  /// <param name="scans">The ordered invoice scans to extract.</param>
  /// <param name="cancellationToken">The token used to cancel extraction.</param>
  /// <returns>The deterministic merged receipt extraction.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the foundation rejects the scan input.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when document analysis fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ExtractInvoiceAsync));
      return await analysisFoundationService
        .ExtractInvoiceAsync(scans, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Delegates invoice summary generation to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs to summarize.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The validated invoice summary.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the foundation rejects the products or correlation identifier.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateInvoiceSummaryAsync));
      return await analysisFoundationService
        .GenerateInvoiceSummaryAsync(products, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Delegates EU-14 allergen assessment to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs to assess.</param>
  /// <param name="classifications">Canonical classifications covering the supplied products.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The allergen assessments keyed by product token.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when required input is absent or inconsistent.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AssessAllergensAsync));
      return await analysisFoundationService
        .AssessAllergensAsync(products, classifications, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Delegates bounded recipe generation to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs available to recipes.</param>
  /// <param name="classifications">Canonical classifications covering the products.</param>
  /// <param name="allergens">Allergen assessments covering the products.</param>
  /// <param name="maximumRecipes">The requested recipe limit.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The validated bounded recipe collection.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when required input is absent, inconsistent, or outside supported bounds.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<RecipeGenerationResult> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    int maximumRecipes,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateRecipesAsync));
      return await analysisFoundationService
        .GenerateRecipesAsync(products, classifications, allergens, maximumRecipes, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Delegates factual merchant description generation to the analysis foundation.</summary>
  /// <param name="merchant">The merchant evidence to describe.</param>
  /// <param name="correlationId">The non-empty durable run identifier.</param>
  /// <param name="cancellationToken">The token used to cancel generation.</param>
  /// <returns>The validated merchant description.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the merchant or correlation identifier is invalid.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when structured generation fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    System.    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateMerchantDescriptionAsync));
      return await analysisFoundationService
        .GenerateMerchantDescriptionAsync(merchant, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Executes the resolved invoice capability graph without persisting aggregate state.</summary>
  /// <param name="message">The durable invoice request containing resolved capability options.</param>
  /// <param name="invoice">The invoice snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel the capability graph.</param>
  /// <returns>The immutable patch, completed capabilities, and first observed failure reason.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the message or invoice is null.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationServiceException">
  /// Thrown when an unclassified orchestration failure prevents producing an execution result.
  /// </exception>
  /// <inheritdoc/>
  public async Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    QueueAnalysisMessage message,
    Invoice invoice,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ExecuteInvoiceAnalysisAsync));
      ArgumentNullException.ThrowIfNull(message);
      ArgumentNullException.ThrowIfNull(invoice);
      activity?.SetTag("analysis.correlation_id", message.CorrelationId.ToString());
      activity?.SetTag("analysis.target_id", message.TargetId.ToString());

      cancellationToken.ThrowIfCancellationRequested();

      if (message.TargetType != AnalysisTargetType.Invoice || message.InvoiceOptions is null)
      {
        return CreateInvoiceFailureResult(message, AnalysisFailureReason.Validation);
      }

      InvoiceAnalysisOptions options = message.InvoiceOptions;
      var completedCapabilities = new ConcurrentQueue<AnalysisCapability>();
      var failureReasons = new ConcurrentQueue<AnalysisFailureReason>();
      IReadOnlyList<ProductAnalysisInput> productInputs = BuildProductInputs(invoice.Items);

      ReceiptExtractionResult? extraction = null;
      InvoiceSummaryResult? summary = null;
      ProductClassificationResult? productClassification = null;
      ProductAllergenAssessmentResult? allergenAssessment = null;
      InvoiceClassificationResult? invoiceClassification = null;
      RecipeGenerationResult? recipeGeneration = null;

      if (options.DocumentExtraction)
      {
        extraction = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.DocumentExtraction,
          () => ExtractInvoiceAsync([.. invoice.Scans], cancellationToken),
          completedCapabilities,
          failureReasons)
          .ConfigureAwait(false);

        if (extraction is not null)
        {
          productInputs = BuildProductInputs(extraction.Products);
        }
      }

      Task<InvoiceSummaryResult?> summaryTask = options.InvoiceSummary
        ? ExecuteBestEffortAsync(
          message,
          AnalysisCapability.InvoiceSummary,
          () => GenerateInvoiceSummaryAsync(
            productInputs,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
        : Task.FromResult<InvoiceSummaryResult?>(null);
      Task<ProductClassificationResult?> productClassificationTask = options.ProductClassification
        ? ExecuteBestEffortAsync(
          message,
          AnalysisCapability.ProductClassification,
          () => ClassifyProductsAsync(productInputs, cancellationToken),
          completedCapabilities,
          failureReasons)
        : Task.FromResult<ProductClassificationResult?>(null);

      await Task.WhenAll(summaryTask, productClassificationTask).ConfigureAwait(false);
      summary = await summaryTask.ConfigureAwait(false);
      productClassification = await productClassificationTask.ConfigureAwait(false);

      if (options.AllergenAssessment && productClassification is not null)
      {
        allergenAssessment = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.AllergenAssessment,
          () => AssessAllergensAsync(
            productInputs,
            productClassification,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
          .ConfigureAwait(false);
      }

      if (options.InvoiceClassification && extraction is not null && productClassification is not null)
      {
        invoiceClassification = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.InvoiceClassification,
          () => ClassifyInvoiceAsync(
            extraction,
            productClassification,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
          .ConfigureAwait(false);
      }

      if (options.RecipeGeneration && productClassification is not null && allergenAssessment is not null)
      {
        recipeGeneration = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.RecipeGeneration,
          () => GenerateRecipesAsync(
            productInputs,
            productClassification,
            allergenAssessment,
            options.MaximumRecipes,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
          .ConfigureAwait(false);
      }

      var patch = new InvoiceAnalysisPatch(
        extraction,
        summary,
        productClassification,
        allergenAssessment,
        invoiceClassification,
        recipeGeneration);

      return new InvoiceAnalysisExecutionResult(
        message,
        patch,
        [.. completedCapabilities],
        failureReasons.TryPeek(out AnalysisFailureReason failureReason) ? failureReason : null);
    }).ConfigureAwait(false);

  private async Task<TResult?> ExecuteBestEffortAsync<TResult>(
    QueueAnalysisMessage message,
    AnalysisCapability capability,
    Func<Task<TResult>> operation,
    ConcurrentQueue<AnalysisCapability> completedCapabilities,
    ConcurrentQueue<AnalysisFailureReason> failureReasons)
    where TResult : class
  {
    long startedAt = System.Diagnostics.Stopwatch.GetTimestamp();

    try
    {
      TResult result = await operation().ConfigureAwait(false);
      completedCapabilities.Enqueue(capability);
      RecordCapabilityOutcome(message, capability, AnalysisOutcome.Success, startedAt, failureReason: null);
      return result;
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception) when (
      exception is AnalysisOrchestrationValidationException
      or AnalysisOrchestrationDependencyException
      or AnalysisOrchestrationDependencyValidationException
      or AnalysisOrchestrationServiceException)
    {
      AnalysisFailureReason failureReason = ResolveFailureReason(exception);
      failureReasons.Enqueue(failureReason);
      RecordCapabilityOutcome(message, capability, AnalysisOutcome.Failure, startedAt, failureReason);
      return null;
    }
  }

  private void RecordCapabilityOutcome(
    QueueAnalysisMessage message,
    AnalysisCapability capability,
    AnalysisOutcome outcome,
    long startedAtTimestamp,
    AnalysisFailureReason? failureReason)
  {
    double durationMs = System.Diagnostics.Stopwatch.GetElapsedTime(startedAtTimestamp).TotalMilliseconds;

    InvoiceMetrics.RecordCapabilityOutcome(capability, outcome, durationMs, failureReason);
    logger.LogAnalysisCapabilityOutcomeObserved(message.CorrelationId, capability, outcome, durationMs);

    if (!failureReason.HasValue)
    {
      return;
    }

    logger.LogAnalysisCapabilityFailureReasonObserved(message.CorrelationId, capability, failureReason.Value);

    if (failureReason.Value == AnalysisFailureReason.InvalidStructuredOutput)
    {
      InvoiceMetrics.RecordCapabilityInvalidStructuredOutput(capability);
      logger.LogAnalysisInvalidStructuredOutputDetected(capability);
    }
  }

  private static AnalysisFailureReason ResolveFailureReason(Exception exception)
  {
    Exception inner = exception.InnerException ?? exception;

    return inner switch
    {
      InvalidStructuredOutputException structured
        when GenerativeAnalysisRefusalMarker.IsRefusal(structured)
          => AnalysisFailureReason.ContentFilter,
      InvalidStructuredOutputException => AnalysisFailureReason.InvalidStructuredOutput,
      TaxonomyCodeNotFoundException => AnalysisFailureReason.Taxonomy,
      _ => exception switch
      {
        AnalysisOrchestrationValidationException => AnalysisFailureReason.Validation,
        AnalysisOrchestrationDependencyValidationException => AnalysisFailureReason.DependencyValidation,
        AnalysisOrchestrationDependencyException => AnalysisFailureReason.Dependency,
        _ => AnalysisFailureReason.Service,
      },
    };
  }

  private static List<ProductAnalysisInput> BuildProductInputs(IEnumerable<Product> products)
  {
    var inputs = new List<ProductAnalysisInput>();
    int index = 0;

    foreach (Product product in products)
    {
      ArgumentNullException.ThrowIfNull(product);
      inputs.Add(new ProductAnalysisInput(AnalysisCorrelationTokens.ForProduct(index), product));
      index++;
    }

    return inputs;
  }

  private static List<ProductAnalysisInput> BuildProductInputs(IReadOnlyList<ExtractedProduct> products)
  {
    var inputs = new List<ProductAnalysisInput>(products.Count);

    for (int index = 0; index < products.Count; index++)
    {
      inputs.Add(new ProductAnalysisInput(
        AnalysisCorrelationTokens.ForProduct(index),
        ExtractedProductMapper.ToDomainProduct(products[index])));
    }

    return inputs;
  }

  private static InvoiceAnalysisExecutionResult CreateInvoiceFailureResult(
    QueueAnalysisMessage message,
    AnalysisFailureReason failureReason) =>
    new(
      message,
      new InvoiceAnalysisPatch(null, null, null, null, null, null),
      CompletedCapabilities: [],
      FailureReason: failureReason);

  /// <summary>Executes the resolved merchant capability graph without persisting aggregate state.</summary>
  /// <param name="message">The durable merchant request containing resolved capability options.</param>
  /// <param name="merchant">The merchant snapshot to analyze.</param>
  /// <param name="cancellationToken">The token used to cancel the capability graph.</param>
  /// <returns>The immutable patch, completed capabilities, and first observed failure reason.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the message or merchant is null.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationServiceException">
  /// Thrown when an unclassified orchestration failure prevents producing an execution result.
  /// </exception>
  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> ExecuteMerchantAnalysisAsync(
    QueueAnalysisMessage message,
    Merchant merchant,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ExecuteMerchantAnalysisAsync));
      ArgumentNullException.ThrowIfNull(message);
      ArgumentNullException.ThrowIfNull(merchant);
      activity?.SetTag("analysis.correlation_id", message.CorrelationId.ToString());
      activity?.SetTag("analysis.target_id", message.TargetId.ToString());

      cancellationToken.ThrowIfCancellationRequested();

      if (message.TargetType != AnalysisTargetType.Merchant || message.MerchantOptions is null)
      {
        return CreateMerchantFailureResult(message, AnalysisFailureReason.Validation);
      }

      MerchantAnalysisOptions options = message.MerchantOptions;
      var completedCapabilities = new ConcurrentQueue<AnalysisCapability>();
      var failureReasons = new ConcurrentQueue<AnalysisFailureReason>();

      MerchantClassificationResult? classification = null;
      MerchantDescriptionResult? description = null;

      Task<MerchantClassificationResult?> classificationTask = options.MerchantClassification
        ? ExecuteBestEffortAsync(
          message,
          AnalysisCapability.MerchantClassification,
          () => ClassifyMerchantAsync(
            merchant,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
        : Task.FromResult<MerchantClassificationResult?>(null);
      Task<MerchantDescriptionResult?> descriptionTask = options.DescriptionGeneration
        ? ExecuteBestEffortAsync(
          message,
          AnalysisCapability.DescriptionGeneration,
          () => GenerateMerchantDescriptionAsync(
            merchant,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities,
          failureReasons)
        : Task.FromResult<MerchantDescriptionResult?>(null);

      await Task.WhenAll(classificationTask, descriptionTask).ConfigureAwait(false);
      classification = await classificationTask.ConfigureAwait(false);
      description = await descriptionTask.ConfigureAwait(false);

      var patch = new MerchantAnalysisPatch(classification, description);

      return new MerchantAnalysisExecutionResult(
        message,
        patch,
        [.. completedCapabilities],
        failureReasons.TryPeek(out AnalysisFailureReason failureReason) ? failureReason : null);
    }).ConfigureAwait(false);

  private static MerchantAnalysisExecutionResult CreateMerchantFailureResult(
    QueueAnalysisMessage message,
    AnalysisFailureReason failureReason) =>
    new(
      message,
      new MerchantAnalysisPatch(null, null),
      CompletedCapabilities: [],
      FailureReason: failureReason);

  private const int MaximumCandidatesPerSearchTerm = 5;
  private const int MaximumCandidatesPerSubject = 10;

  /// <summary>Resolves an optional code-only manual selection against its required taxonomy.</summary>
  /// <param name="classificationCode">The optional classification code that is authoritative for resolution.</param>
  /// <param name="expectedSystem">The taxonomy system required by the target field.</param>
  /// <param name="cancellationToken">The token used to cancel taxonomy resolution.</param>
  /// <returns>The canonical manual classification, or <see langword="null"/> when no selection was supplied.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the code is whitespace or cannot be resolved in the expected system.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when taxonomy access fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<StandardClassification?> ResolveManualClassificationAsync(
    string? classificationCode,
    ClassificationSystem expectedSystem,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ResolveManualClassificationAsync));

      if (classificationCode is null)
      {
        return null;
      }

      ArgumentException.ThrowIfNullOrWhiteSpace(classificationCode);

      return await analysisFoundationService
        .ResolveClassificationAsync(
          expectedSystem,
          classificationCode.Trim(),
          ClassificationOrigin.Manual,
          confidence: null,
          evidence: [],
          cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Classifies transient products against bounded GS1 GPC candidates.</summary>
  /// <param name="products">The non-empty product inputs keyed by unique correlation tokens.</param>
  /// <param name="cancellationToken">The token used to cancel generation and taxonomy access.</param>
  /// <returns>Canonical GS1 GPC classifications keyed by product token.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when products are absent or no usable classification input is available.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when generation or taxonomy access fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyProductsAsync));
      ArgumentNullException.ThrowIfNull(products);

      if (products.Count == 0)
      {
        throw new ArgumentException("At least one product is required for classification.", nameof(products));
      }

      var subjects = products.ToDictionary(
        product => product.CorrelationToken,
        product => product.Product.Name,
        StringComparer.Ordinal);

      IReadOnlyDictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
        AnalysisCapability.ProductClassification,
        ClassificationSystem.Gs1Gpc,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);

      return new ProductClassificationResult(classifications);
    }).ConfigureAwait(false);

  /// <summary>Classifies an extracted invoice against bounded ECOICOP v2 candidates.</summary>
  /// <param name="extraction">The typed receipt extraction used as invoice evidence.</param>
  /// <param name="products">The canonical product classifications used as supporting evidence.</param>
  /// <param name="sourceRunId">The non-empty run identifier used as the transient subject token.</param>
  /// <param name="cancellationToken">The token used to cancel generation and taxonomy access.</param>
  /// <returns>The canonical ECOICOP v2 invoice classification.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when required evidence is null or the run identifier is empty.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when generation or taxonomy access fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyInvoiceAsync));
      ArgumentNullException.ThrowIfNull(extraction);
      ArgumentNullException.ThrowIfNull(products);

      if (sourceRunId == Guid.Empty)
      {
        throw new ArgumentException("Source run identifier must not be empty.", nameof(sourceRunId));
      }

      var subjects = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        [sourceRunId.ToString()] = BuildInvoiceDescription(extraction, products),
      };

      Dictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
        AnalysisCapability.InvoiceClassification,
        ClassificationSystem.EcoicopV2,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);

      return new InvoiceClassificationResult(classifications[sourceRunId.ToString()]);
    }).ConfigureAwait(false);

  /// <summary>Classifies a merchant against bounded NACE 2.1 candidates.</summary>
  /// <param name="merchant">The merchant snapshot used to build classification evidence.</param>
  /// <param name="sourceRunId">The non-empty run identifier used as the transient subject token.</param>
  /// <param name="cancellationToken">The token used to cancel generation and taxonomy access.</param>
  /// <returns>The canonical NACE 2.1 merchant classification.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationValidationException">
  /// Thrown when the merchant is null or the run identifier is empty.
  /// </exception>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Orchestration.AnalysisOrchestrationDependencyException">
  /// Thrown when generation or taxonomy access fails.
  /// </exception>
  /// <inheritdoc/>
  public async Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyMerchantAsync));
      ArgumentNullException.ThrowIfNull(merchant);

      if (sourceRunId == Guid.Empty)
      {
        throw new ArgumentException("Source run identifier must not be empty.", nameof(sourceRunId));
      }

      var subjects = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        [sourceRunId.ToString()] = BuildMerchantDescription(merchant),
      };

      Dictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
        AnalysisCapability.MerchantClassification,
        ClassificationSystem.Nace21,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);

      return new MerchantClassificationResult(classifications[sourceRunId.ToString()]);
    }).ConfigureAwait(false);

  private async Task<Dictionary<string, StandardClassification>> ClassifyBatchAsync(
    AnalysisCapability capability,
    ClassificationSystem system,
    Dictionary<string, string> subjectDescriptions,
    CancellationToken cancellationToken)
  {
    string taxonomyVersion = await analysisFoundationService
      .GetTaxonomyVersionAsync(system, cancellationToken)
      .ConfigureAwait(false);

    IReadOnlyDictionary<string, IReadOnlyList<string>> searchTermsByToken = await analysisFoundationService
      .GenerateClassificationSearchTermsAsync(capability, system, taxonomyVersion, subjectDescriptions, cancellationToken)
      .ConfigureAwait(false);

    var candidatesByToken = new Dictionary<string, IReadOnlyList<ClassificationCandidateOption>>(StringComparer.Ordinal);

    foreach ((string token, string description) in subjectDescriptions)
    {
      IReadOnlyList<string> searchTerms = searchTermsByToken[token];
      ValidateSearchTermsAreUsable(searchTerms, token);
      candidatesByToken[token] = await CollectBoundedCandidatesAsync(system, searchTerms, cancellationToken).ConfigureAwait(false);
    }

    IReadOnlyDictionary<string, SelectedClassificationCandidate> selections = await analysisFoundationService
      .SelectClassificationCandidatesAsync(capability, system, taxonomyVersion, candidatesByToken, cancellationToken)
      .ConfigureAwait(false);

    var classifications = new Dictionary<string, StandardClassification>(StringComparer.Ordinal);

    foreach ((string token, IReadOnlyList<ClassificationCandidateOption> candidates) in candidatesByToken)
    {
      SelectedClassificationCandidate selection = selections[token];
      ValidateSelectedCodeIsCandidate(selection.Code, candidates, token);

      try
      {
        classifications[token] = await analysisFoundationService
          .ResolveClassificationAsync(
            system,
            selection.Code,
            ClassificationOrigin.Analysis,
            NormalizeConfidence(selection.Confidence),
            [new ClassificationEvidence("subject.description", subjectDescriptions[token])],
            cancellationToken)
          .ConfigureAwait(false);
      }
      catch (AnalysisFoundationDependencyValidationException exception)
        when (exception.InnerException is TaxonomyCodeNotFoundException)
      {
        RecordTaxonomyValidationFailure(system);
        throw;
      }
    }

    return classifications;
  }

  private async Task<IReadOnlyList<ClassificationCandidateOption>> CollectBoundedCandidatesAsync(
    ClassificationSystem system,
    IReadOnlyList<string> searchTerms,
    CancellationToken cancellationToken)
  {
    var candidates = new List<ClassificationCandidateOption>();
    var seenCodes = new HashSet<string>(StringComparer.Ordinal);

    foreach (string searchTerm in searchTerms)
    {
      if (candidates.Count >= MaximumCandidatesPerSubject || string.IsNullOrWhiteSpace(searchTerm))
      {
        continue;
      }

      IReadOnlyList<ClassificationCandidateOption> matches = await analysisFoundationService
        .SearchTaxonomyAsync(system, searchTerm, MaximumCandidatesPerSearchTerm, cancellationToken)
        .ConfigureAwait(false);

      foreach (ClassificationCandidateOption match in matches)
      {
        if (candidates.Count >= MaximumCandidatesPerSubject)
        {
          break;
        }

        if (seenCodes.Add(match.Code))
        {
          candidates.Add(match);
        }
      }
    }

    return candidates;
  }

  private static void ValidateSearchTermsAreUsable(IReadOnlyList<string> searchTerms, string correlationToken)
  {
    if (searchTerms.Count == 0 || searchTerms.All(string.IsNullOrWhiteSpace))
    {
      throw new InvalidStructuredOutputException(
        $"No usable search terms were produced for correlation token '{correlationToken}'.");
    }
  }

  private static void ValidateSelectedCodeIsCandidate(
    string selectedCode,
    IReadOnlyList<ClassificationCandidateOption> candidates,
    string correlationToken)
  {
    if (string.IsNullOrWhiteSpace(selectedCode))
    {
      throw new InvalidStructuredOutputException(
        $"No taxonomy code was selected for correlation token '{correlationToken}'.");
    }

    bool isKnownCandidate = candidates.Any(candidate => string.Equals(candidate.Code, selectedCode, StringComparison.Ordinal));

    if (!isKnownCandidate)
    {
      throw new InvalidStructuredOutputException(
        $"Selected taxonomy code '{selectedCode}' for correlation token '{correlationToken}' was not among the offered candidates.");
    }
  }

  private static double NormalizeConfidence(double confidence) => Math.Clamp(confidence, 0d, 1d);

  private static string BuildInvoiceDescription(ReceiptExtractionResult extraction, ProductClassificationResult products)
  {
    IEnumerable<string> productNames = extraction.Products
      .Select(product => product.Name)
      .Where(name => !string.IsNullOrWhiteSpace(name));

    IEnumerable<string> productCategories = products.Classifications.Values
      .Select(classification => classification.OfficialLabel)
      .Distinct(StringComparer.Ordinal);

    return string.Join(
      " ",
      $"Receipt type: {extraction.ReceiptType}.",
      $"Products: {string.Join(", ", productNames)}.",
      $"Detected product categories: {string.Join(", ", productCategories)}.");
  }

  private static string BuildMerchantDescription(Merchant merchant) =>
    string.Join(
      " ",
      $"Merchant name: {merchant.Name}.",
      $"Category: {merchant.Classification?.OfficialLabel ?? "unknown"}.",
      $"Address: {merchant.Address.Address}.");

  private void RecordTaxonomyValidationFailure(ClassificationSystem classificationSystem)
  {
    InvoiceMetrics.RecordTaxonomyValidationFailure(classificationSystem);
    logger.LogAnalysisTaxonomyValidationFailed(classificationSystem);
  }
}
