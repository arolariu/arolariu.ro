namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Orchestration;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisProcessingService
{
  /// <inheritdoc/>
  public async Task<InvoiceAnalysisExecutionResult> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
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
          () => analysisOrchestrationService.ExtractInvoiceAsync([.. invoice.Scans], cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);

        if (extraction is not null)
        {
          productInputs = BuildProductInputs(extraction.Products);
        }
      }

      if (options.InvoiceSummary)
      {
        summary = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.InvoiceSummary,
          () => analysisOrchestrationService.GenerateInvoiceSummaryAsync(
            productInputs,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      if (options.ProductClassification)
      {
        productClassification = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.ProductClassification,
          () => classificationOrchestrationService.ClassifyProductsAsync(productInputs, cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      if (options.AllergenAssessment && productClassification is not null)
      {
        allergenAssessment = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.AllergenAssessment,
          () => analysisOrchestrationService.AssessAllergensAsync(
            productInputs,
            productClassification,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      if (options.InvoiceClassification && extraction is not null && productClassification is not null)
      {
        invoiceClassification = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.InvoiceClassification,
          () => classificationOrchestrationService.ClassifyInvoiceAsync(
            extraction,
            productClassification,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities)
          .ConfigureAwait(false);
      }

      if (options.RecipeGeneration && productClassification is not null && allergenAssessment is not null)
      {
        recipeGeneration = await ExecuteBestEffortAsync(
          message,
          AnalysisCapability.RecipeGeneration,
          () => analysisOrchestrationService.GenerateRecipesAsync(
            productInputs,
            productClassification,
            allergenAssessment,
            options.MaximumRecipes,
            message.CorrelationId,
            cancellationToken),
          completedCapabilities)
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
        [.. completedCapabilities]);
    }).ConfigureAwait(false);

  private async Task<TResult?> ExecuteBestEffortAsync<TResult>(
    AnalysisQueueMessage message,
    AnalysisCapability capability,
    Func<Task<TResult>> operation,
    ConcurrentQueue<AnalysisCapability> completedCapabilities)
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
      RecordCapabilityOutcome(message, capability, AnalysisOutcome.Failure, startedAt, ResolveFailureReason(exception));
      return null;
    }
  }

  private void RecordCapabilityOutcome(
    AnalysisQueueMessage message,
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
    AnalysisQueueMessage message,
    AnalysisFailureReason failureReason) =>
    new(
      message,
      new InvoiceAnalysisPatch(null, null, null, null, null, null),
      CompletedCapabilities: [],
      FailureReason: failureReason);
}
