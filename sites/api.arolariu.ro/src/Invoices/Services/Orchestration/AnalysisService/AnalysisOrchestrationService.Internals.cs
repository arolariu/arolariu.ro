namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System.Collections.Generic;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using System;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System.Linq;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
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
  private async Task<ReceiptExtraction> ExtractInvoiceAsync(
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
  private async Task<(string Name, string Description)> GenerateInvoiceSummaryAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    Guid correlationId,
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
  private async Task<IReadOnlyDictionary<string, AllergenAssessment>> AssessAllergensAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    IReadOnlyDictionary<string, StandardClassification> classifications,
    Guid correlationId,
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
  private async Task<IReadOnlyList<RecipeSuggestion>> GenerateRecipesAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    IReadOnlyDictionary<string, StandardClassification> classifications,
    IReadOnlyDictionary<string, AllergenAssessment> allergens,
    int maximumRecipes,
    Guid correlationId,
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
  private async Task<string> GenerateMerchantDescriptionAsync(
    Merchant merchant,
    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateMerchantDescriptionAsync));
      return await analysisFoundationService
        .GenerateMerchantDescriptionAsync(merchant, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<(Invoice Invoice, InvoiceAnalysisOptions? FailedOptions)> AnalyzeInvoiceAsync(
    Invoice invoice,
    InvoiceAnalysisOptions options,
    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync));
      ArgumentNullException.ThrowIfNull(invoice);
      ArgumentNullException.ThrowIfNull(options);

      if (correlationId == Guid.Empty)
      {
        throw new ArgumentException("Correlation identifier must not be empty.", nameof(correlationId));
      }

      activity?.SetTag("analysis.correlation_id", correlationId);
      activity?.SetTag("analysis.target_id", invoice.id);
      cancellationToken.ThrowIfCancellationRequested();

      ReceiptExtraction? extraction = options.InvoiceClassification && !options.DocumentExtraction
        ? CreateExtractionSnapshot(invoice)
        : null;
      bool extractionAvailable = !options.InvoiceClassification || extraction is not null || options.DocumentExtraction;
      bool failedExtraction = false;

      if (options.DocumentExtraction)
      {
        CapabilityAttempt<ReceiptExtraction> attempt = await ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.DocumentExtraction,
          () => ExtractInvoiceAsync([.. invoice.Scans], cancellationToken))
          .ConfigureAwait(false);
        failedExtraction = !attempt.Succeeded;

        if (attempt.Succeeded)
        {
          extraction = attempt.Result;
          ApplyExtraction(invoice, extraction);
        }
        else
        {
          extractionAvailable = false;
        }
      }

      List<ProductAnalysisInput> productInputs = BuildProductInputs(invoice.Items);
      IReadOnlyDictionary<string, StandardClassification> classifications =
        GetPersistedProductClassifications(productInputs);
      bool classificationsAvailable = classifications.Count == productInputs.Count;
      bool failedSummary = false;
      bool failedProductClassification = false;

      Task<CapabilityAttempt<(string Name, string Description)>> summaryTask = options.InvoiceSummary
        ? ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.InvoiceSummary,
          () => GenerateInvoiceSummaryAsync(productInputs, correlationId, cancellationToken))
        : Task.FromResult(CapabilityAttempt<(string Name, string Description)>.NotRun);
      Task<CapabilityAttempt<IReadOnlyDictionary<string, StandardClassification>>> classificationTask =
        options.ProductClassification
          ? ExecuteBestEffortAsync(
            correlationId,
            AnalysisCapability.ProductClassification,
            () => ClassifyProductsAsync(productInputs, cancellationToken))
          : Task.FromResult(CapabilityAttempt<IReadOnlyDictionary<string, StandardClassification>>.NotRun);

      await Task.WhenAll(summaryTask, classificationTask).ConfigureAwait(false);
      CapabilityAttempt<(string Name, string Description)> summaryAttempt =
        await summaryTask.ConfigureAwait(false);
      CapabilityAttempt<IReadOnlyDictionary<string, StandardClassification>> classificationAttempt =
        await classificationTask.ConfigureAwait(false);

      if (options.InvoiceSummary)
      {
        failedSummary = !summaryAttempt.Succeeded;

        if (summaryAttempt.Succeeded)
        {
          invoice.Name = summaryAttempt.Result.Name;
          invoice.Description = summaryAttempt.Result.Description;
        }
      }

      if (options.ProductClassification)
      {
        failedProductClassification = !classificationAttempt.Succeeded;
        classificationsAvailable = classificationAttempt.Succeeded;

        if (classificationAttempt.Succeeded)
        {
          classifications = classificationAttempt.Result;
          ApplyProductClassifications(invoice, classifications);
        }
      }

      bool failedAllergens = false;
      IReadOnlyDictionary<string, AllergenAssessment> allergens = GetPersistedAllergenAssessments(productInputs);
      bool allergensAvailable = allergens.Count == productInputs.Count;

      if (options.AllergenAssessment)
      {
        if (!classificationsAvailable)
        {
          failedAllergens = true;
          allergensAvailable = false;
          RecordBlockedCapability(correlationId, AnalysisCapability.AllergenAssessment);
        }
        else
        {
          CapabilityAttempt<IReadOnlyDictionary<string, AllergenAssessment>> attempt =
            await ExecuteBestEffortAsync(
              correlationId,
              AnalysisCapability.AllergenAssessment,
              () => AssessAllergensAsync(productInputs, classifications, correlationId, cancellationToken))
            .ConfigureAwait(false);
          failedAllergens = !attempt.Succeeded;
          allergensAvailable = attempt.Succeeded;

          if (attempt.Succeeded)
          {
            allergens = attempt.Result;
            ApplyAllergenAssessments(invoice, allergens);
          }
        }
      }

      bool failedInvoiceClassification = false;

      if (options.InvoiceClassification)
      {
        if (!extractionAvailable || !classificationsAvailable)
        {
          failedInvoiceClassification = true;
          RecordBlockedCapability(correlationId, AnalysisCapability.InvoiceClassification);
        }
        else
        {
          CapabilityAttempt<StandardClassification> attempt = await ExecuteBestEffortAsync(
            correlationId,
            AnalysisCapability.InvoiceClassification,
            () => ClassifyInvoiceAsync(extraction!, classifications, correlationId, cancellationToken))
            .ConfigureAwait(false);
          failedInvoiceClassification = !attempt.Succeeded;

          if (attempt.Succeeded)
          {
            invoice.Classification = attempt.Result;
          }
        }
      }

      bool failedRecipes = false;

      if (options.RecipeGeneration)
      {
        if (!classificationsAvailable || !allergensAvailable)
        {
          failedRecipes = true;
          RecordBlockedCapability(correlationId, AnalysisCapability.RecipeGeneration);
        }
        else
        {
          CapabilityAttempt<IReadOnlyList<RecipeSuggestion>> attempt = await ExecuteBestEffortAsync(
            correlationId,
            AnalysisCapability.RecipeGeneration,
            () => GenerateRecipesAsync(
              productInputs,
              classifications,
              allergens,
              options.MaximumRecipes,
              correlationId,
              cancellationToken))
            .ConfigureAwait(false);
          failedRecipes = !attempt.Succeeded;

          if (attempt.Succeeded)
          {
            invoice.PossibleRecipes = [.. attempt.Result];
          }
        }
      }

      InvoiceAnalysisOptions? failedOptions = CreateFailedInvoiceOptions(
        options,
        failedExtraction,
        failedSummary,
        failedProductClassification,
        failedAllergens,
        failedInvoiceClassification,
        failedRecipes);

      return (invoice, failedOptions);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<(Merchant Merchant, MerchantAnalysisOptions? FailedOptions)> AnalyzeMerchantAsync(
    Merchant merchant,
    MerchantAnalysisOptions options,
    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeMerchantAsync));
      ArgumentNullException.ThrowIfNull(merchant);
      ArgumentNullException.ThrowIfNull(options);

      if (correlationId == Guid.Empty)
      {
        throw new ArgumentException("Correlation identifier must not be empty.", nameof(correlationId));
      }

      activity?.SetTag("analysis.correlation_id", correlationId);
      activity?.SetTag("analysis.target_id", merchant.id);
      cancellationToken.ThrowIfCancellationRequested();

      Task<CapabilityAttempt<StandardClassification>> classificationTask = options.MerchantClassification
        ? ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.MerchantClassification,
          () => ClassifyMerchantAsync(merchant, correlationId, cancellationToken))
        : Task.FromResult(CapabilityAttempt<StandardClassification>.NotRun);
      Task<CapabilityAttempt<string>> descriptionTask = options.DescriptionGeneration
        ? ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.DescriptionGeneration,
          () => GenerateMerchantDescriptionAsync(merchant, correlationId, cancellationToken))
        : Task.FromResult(CapabilityAttempt<string>.NotRun);

      await Task.WhenAll(classificationTask, descriptionTask).ConfigureAwait(false);
      CapabilityAttempt<StandardClassification> classificationAttempt =
        await classificationTask.ConfigureAwait(false);
      CapabilityAttempt<string> descriptionAttempt = await descriptionTask.ConfigureAwait(false);

      if (classificationAttempt.Succeeded)
      {
        merchant.Classification = classificationAttempt.Result;
      }

      if (descriptionAttempt.Succeeded)
      {
        merchant.Description = descriptionAttempt.Result;
      }

      bool failedClassification = options.MerchantClassification && !classificationAttempt.Succeeded;
      bool failedDescription = options.DescriptionGeneration && !descriptionAttempt.Succeeded;
      MerchantAnalysisOptions? failedOptions = failedClassification || failedDescription
        ? new MerchantAnalysisOptions(
          AnalysisProfile.Custom,
          failedClassification,
          failedDescription)
        : null;

      return (merchant, failedOptions);
    }).ConfigureAwait(false);

  private async Task<CapabilityAttempt<TResult>> ExecuteBestEffortAsync<TResult>(
    Guid correlationId,
    AnalysisCapability capability,
    Func<Task<TResult>> operation)
  {
    long startedAt = System.Diagnostics.Stopwatch.GetTimestamp();

    try
    {
      TResult result = await operation().ConfigureAwait(false);
      RecordCapabilityOutcome(correlationId, capability, AnalysisOutcome.Success, startedAt, failureReason: null);
      return CapabilityAttempt<TResult>.Success(result);
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
      RecordCapabilityOutcome(correlationId, capability, AnalysisOutcome.Failure, startedAt, failureReason);
      return CapabilityAttempt<TResult>.Failure;
    }
  }

  private void RecordCapabilityOutcome(
    Guid correlationId,
    AnalysisCapability capability,
    AnalysisOutcome outcome,
    long startedAtTimestamp,
    AnalysisFailureReason? failureReason)
  {
    double durationMs = System.Diagnostics.Stopwatch.GetElapsedTime(startedAtTimestamp).TotalMilliseconds;

    InvoiceMetrics.RecordCapabilityOutcome(capability, outcome, durationMs, failureReason);
    logger.LogAnalysisCapabilityOutcomeObserved(correlationId, capability, outcome, durationMs);

    if (!failureReason.HasValue)
    {
      return;
    }

    logger.LogAnalysisCapabilityFailureReasonObserved(correlationId, capability, failureReason.Value);

    if (failureReason.Value == AnalysisFailureReason.InvalidStructuredOutput)
    {
      InvoiceMetrics.RecordCapabilityInvalidStructuredOutput(capability);
      logger.LogAnalysisInvalidStructuredOutputDetected(capability);
    }
  }

  private void RecordBlockedCapability(Guid correlationId, AnalysisCapability capability)
  {
    InvoiceMetrics.RecordCapabilityOutcome(
      capability,
      AnalysisOutcome.Failure,
      durationMs: 0,
      AnalysisFailureReason.DependencyValidation);
    logger.LogAnalysisCapabilityFailureReasonObserved(
      correlationId,
      capability,
      AnalysisFailureReason.DependencyValidation);
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
      inputs.Add(new ProductAnalysisInput($"product:{index}", product));
      index++;
    }

    return inputs;
  }

  private static Dictionary<string, StandardClassification> GetPersistedProductClassifications(
    IReadOnlyList<ProductAnalysisInput> products)
  {
    var classifications = new Dictionary<string, StandardClassification>(StringComparer.Ordinal);

    foreach (ProductAnalysisInput product in products)
    {
      if (product.Product.Classification is not null)
      {
        classifications[product.CorrelationToken] = product.Product.Classification;
      }
    }

    return classifications;
  }

  private static Dictionary<string, AllergenAssessment> GetPersistedAllergenAssessments(
    IReadOnlyList<ProductAnalysisInput> products)
  {
    var assessments = new Dictionary<string, AllergenAssessment>(StringComparer.Ordinal);

    foreach (ProductAnalysisInput product in products)
    {
      if (product.Product.AllergenAssessment is not null)
      {
        assessments[product.CorrelationToken] = product.Product.AllergenAssessment;
      }
    }

    return assessments;
  }

  private static InvoiceAnalysisOptions? CreateFailedInvoiceOptions(
    InvoiceAnalysisOptions requested,
    bool documentExtraction,
    bool invoiceSummary,
    bool productClassification,
    bool allergenAssessment,
    bool invoiceClassification,
    bool recipeGeneration)
  {
    if (!documentExtraction
        && !invoiceSummary
        && !productClassification
        && !allergenAssessment
        && !invoiceClassification
        && !recipeGeneration)
    {
      return null;
    }

    return new InvoiceAnalysisOptions(
      AnalysisProfile.Custom,
      documentExtraction,
      invoiceSummary,
      productClassification,
      allergenAssessment,
      invoiceClassification,
      recipeGeneration,
      recipeGeneration ? requested.MaximumRecipes : 0);
  }

  private static ReceiptExtraction CreateExtractionSnapshot(Invoice invoice) =>
    new(
      [.. invoice.Items],
      invoice.PaymentInformation,
      invoice.ReceiptType,
      invoice.CountryRegion,
      [.. invoice.TaxDetails],
      [.. invoice.Payments]);

  private static void ApplyExtraction(Invoice invoice, ReceiptExtraction extraction)
  {
    invoice.Items = ReconcileProducts(invoice.Items, extraction.Products);
    invoice.PaymentInformation = extraction.PaymentInformation;
    invoice.ReceiptType = extraction.ReceiptType;
    invoice.CountryRegion = extraction.CountryRegion;
    invoice.TaxDetails = [.. extraction.TaxDetails];
    invoice.Payments = [.. extraction.Payments];
  }

  private static void ApplyProductClassifications(
    Invoice invoice,
    IReadOnlyDictionary<string, StandardClassification> classifications)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      if (classifications.TryGetValue($"product:{index}", out StandardClassification? classification))
      {
        items[index].Classification = classification;
      }
    }
  }

  private static void ApplyAllergenAssessments(
    Invoice invoice,
    IReadOnlyDictionary<string, AllergenAssessment> assessments)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      if (assessments.TryGetValue($"product:{index}", out AllergenAssessment? assessment))
      {
        items[index].AllergenAssessment = assessment;
      }
    }
  }

  private const string InvariantNumberFormat = "0.############################";

  private static List<Product> ReconcileProducts(
    IEnumerable<Product>? previousItems,
    IReadOnlyList<Product> extractedProducts)
  {
    ArgumentNullException.ThrowIfNull(extractedProducts);

    ProductCarryOverIndex carryOver = ProductCarryOverIndex.Build(previousItems);
    var reconciled = new List<Product>(extractedProducts.Count);

    foreach (Product extracted in extractedProducts)
    {
      Product? previous = carryOver.TryTake(extracted);

      if (previous is not null)
      {
        extracted.Classification = previous.Classification;
        extracted.AllergenAssessment = previous.AllergenAssessment;

        ProductMetadata metadata = previous.Metadata;
        metadata.Confidence = extracted.Metadata.Confidence;
        extracted.Metadata = metadata;
      }

      reconciled.Add(extracted);
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

  private readonly record struct CapabilityAttempt<TResult>(bool Succeeded, TResult Result)
  {
    internal static CapabilityAttempt<TResult> NotRun => new(false, default!);

    internal static CapabilityAttempt<TResult> Failure => new(false, default!);

    internal static CapabilityAttempt<TResult> Success(TResult result) => new(true, result);
  }

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
  private async Task<IReadOnlyDictionary<string, StandardClassification>> ClassifyProductsAsync(
    List<ProductAnalysisInput> products,
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

      return await ClassifyBatchAsync(
        AnalysisCapability.ProductClassification,
        ClassificationSystem.Gs1Gpc,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);
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
  private async Task<StandardClassification> ClassifyInvoiceAsync(
    ReceiptExtraction extraction,
    IReadOnlyDictionary<string, StandardClassification> products,
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

      return classifications[sourceRunId.ToString()];
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
  private async Task<StandardClassification> ClassifyMerchantAsync(
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

      return classifications[sourceRunId.ToString()];
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

  private static string BuildInvoiceDescription(
    ReceiptExtraction extraction,
    IReadOnlyDictionary<string, StandardClassification> products)
  {
    IEnumerable<string> productNames = extraction.Products
      .Select(product => product.Name)
      .Where(name => !string.IsNullOrWhiteSpace(name));

    IEnumerable<string> productCategories = products.Values
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
