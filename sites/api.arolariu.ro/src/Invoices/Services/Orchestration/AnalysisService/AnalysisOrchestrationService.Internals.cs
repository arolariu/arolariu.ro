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
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using System.Linq;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.Categories;
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
  /// <param name="categories">Optional categories covering the supplied products.</param>
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
    IReadOnlyDictionary<string, ProductCategory?> categories,
    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AssessAllergensAsync));
      return await analysisFoundationService
        .AssessAllergensAsync(products, categories, correlationId, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <summary>Delegates bounded recipe generation to the unified analysis foundation.</summary>
  /// <param name="products">The transient product inputs available to recipes.</param>
  /// <param name="categories">Optional categories covering the products.</param>
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
    IReadOnlyDictionary<string, ProductCategory?> categories,
    IReadOnlyDictionary<string, AllergenAssessment> allergens,
    int maximumRecipes,
    Guid correlationId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GenerateRecipesAsync));
      return await analysisFoundationService
        .GenerateRecipesAsync(products, categories, allergens, maximumRecipes, correlationId, cancellationToken)
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
      var targets = productInputs.Where(input => input.Product.Category is null)
        .ToDictionary(input => input.CorrelationToken, input => input.Product.Name, StringComparer.Ordinal);
      bool categorizeProducts = options.ProductClassification && targets.Count > 0;
      bool categoriesAvailable = true;
      bool failedSummary = false;
      bool failedProductClassification = false;

      Task<CapabilityAttempt<(string Name, string Description)>> summaryTask = options.InvoiceSummary
        ? ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.InvoiceSummary,
          () => GenerateInvoiceSummaryAsync(productInputs, correlationId, cancellationToken))
        : Task.FromResult(CapabilityAttempt<(string Name, string Description)>.NotRun);
      Task<CapabilityAttempt<IReadOnlyDictionary<string, ProductCategory?>>> classificationTask =
        categorizeProducts
          ? ExecuteBestEffortAsync(
            correlationId,
            AnalysisCapability.ProductClassification,
            () => TryCatchAsync(() => analysisFoundationService.SelectProductCategoriesAsync(targets, cancellationToken)))
          : Task.FromResult(CapabilityAttempt<IReadOnlyDictionary<string, ProductCategory?>>.NotRun);

      await Task.WhenAll(summaryTask, classificationTask).ConfigureAwait(false);
      CapabilityAttempt<(string Name, string Description)> summaryAttempt =
        await summaryTask.ConfigureAwait(false);
      CapabilityAttempt<IReadOnlyDictionary<string, ProductCategory?>> classificationAttempt =
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

      if (categorizeProducts)
      {
        failedProductClassification = !classificationAttempt.Succeeded;
        categoriesAvailable = classificationAttempt.Succeeded;
        if (classificationAttempt.Succeeded)
        {
          foreach (ProductAnalysisInput input in productInputs)
          {
            if (input.Product.Category is null && classificationAttempt.Result.TryGetValue(input.CorrelationToken, out var category))
            {
              input.Product.Category = category;
            }
          }
        }
      }

      var categories = productInputs.ToDictionary(input => input.CorrelationToken, input => input.Product.Category, StringComparer.Ordinal);

      bool failedAllergens = false;
      IReadOnlyDictionary<string, AllergenAssessment> allergens = GetPersistedAllergenAssessments(productInputs);
      bool allergensAvailable = allergens.Count == productInputs.Count;

      if (options.AllergenAssessment)
      {
        if (!categoriesAvailable)
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
              () => AssessAllergensAsync(productInputs, categories, correlationId, cancellationToken))
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

      if (options.InvoiceClassification && invoice.Category is null)
      {
        if (!extractionAvailable || !categoriesAvailable)
        {
          failedInvoiceClassification = true;
          RecordBlockedCapability(correlationId, AnalysisCapability.InvoiceClassification);
        }
        else
        {
          CapabilityAttempt<InvoiceCategory?> attempt = await ExecuteBestEffortAsync(
            correlationId,
            AnalysisCapability.InvoiceClassification,
            () => SelectInvoiceCategoryAsync(extraction!, categories, correlationId, cancellationToken))
            .ConfigureAwait(false);
          failedInvoiceClassification = !attempt.Succeeded;

          if (attempt.Succeeded)
          {
            invoice.Category = attempt.Result;
          }
        }
      }

      bool failedRecipes = false;

      if (options.RecipeGeneration)
      {
        if (!categoriesAvailable || !allergensAvailable)
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
              categories,
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

      bool categorizeMerchant = options.MerchantClassification && merchant.Category is null;
      Task<CapabilityAttempt<MerchantCategory?>> classificationTask = categorizeMerchant
        ? ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.MerchantClassification,
          () => SelectMerchantCategoryAsync(merchant, correlationId, cancellationToken))
        : Task.FromResult(CapabilityAttempt<MerchantCategory?>.NotRun);
      Task<CapabilityAttempt<string>> descriptionTask = options.DescriptionGeneration
        ? ExecuteBestEffortAsync(
          correlationId,
          AnalysisCapability.DescriptionGeneration,
          () => GenerateMerchantDescriptionAsync(merchant, correlationId, cancellationToken))
        : Task.FromResult(CapabilityAttempt<string>.NotRun);

      await Task.WhenAll(classificationTask, descriptionTask).ConfigureAwait(false);
      CapabilityAttempt<MerchantCategory?> classificationAttempt =
        await classificationTask.ConfigureAwait(false);
      CapabilityAttempt<string> descriptionAttempt = await descriptionTask.ConfigureAwait(false);

      if (classificationAttempt.Succeeded)
      {
        merchant.Category = classificationAttempt.Result;
      }

      if (descriptionAttempt.Succeeded)
      {
        merchant.Description = descriptionAttempt.Result;
      }

      bool failedClassification = categorizeMerchant && !classificationAttempt.Succeeded;
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
        extracted.Category = previous.Category;
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

  private async Task<InvoiceCategory?> SelectInvoiceCategoryAsync(
    ReceiptExtraction extraction, IReadOnlyDictionary<string, ProductCategory?> categories,
    Guid correlationId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      string token = correlationId.ToString();
      var subjects = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        [token] = BuildInvoiceDescription(extraction, categories),
      };
      var selected = await analysisFoundationService.SelectInvoiceCategoriesAsync(subjects, cancellationToken).ConfigureAwait(false);
      return selected[token];
    }).ConfigureAwait(false);

  private async Task<MerchantCategory?> SelectMerchantCategoryAsync(
    Merchant merchant, Guid correlationId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      string token = correlationId.ToString();
      var subjects = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        [token] = $"Merchant name: {merchant.Name}. Description: {merchant.Description}. Address: {merchant.Address.Address}.",
      };
      var selected = await analysisFoundationService.SelectMerchantCategoriesAsync(subjects, cancellationToken).ConfigureAwait(false);
      return selected[token];
    }).ConfigureAwait(false);

  private static string BuildInvoiceDescription(ReceiptExtraction extraction, IReadOnlyDictionary<string, ProductCategory?> categories)
  {
    var productNames = extraction.Products.Select(product => product.Name).Where(name => !string.IsNullOrWhiteSpace(name));
    var productCategories = categories.Values.OfType<ProductCategory>()
      .Select(category => CategoryCatalog.GetProduct(category).Label).Distinct(StringComparer.Ordinal);
    return $"Receipt type: {extraction.ReceiptType}. Products: {string.Join(", ", productNames)}. Known product categories: {string.Join(", ", productCategories)}.";
  }
}
