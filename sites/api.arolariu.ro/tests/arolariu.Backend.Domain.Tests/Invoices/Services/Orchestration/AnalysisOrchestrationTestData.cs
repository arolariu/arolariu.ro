namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Provides deterministic orchestration-service test doubles and reusable analysis result fixtures.
/// </summary>
internal static class AnalysisOrchestrationTestData
{
  /// <summary>Creates the orchestration service with successful capability foundations.</summary>
  internal static AnalysisOrchestrationService CreateService() =>
    new(
      new UnsupportedAnalysisRunFoundationService(),
      new SuccessfulDocumentAnalysisFoundationService(),
      new SuccessfulGenerativeAnalysisFoundationService(),
      NullLoggerFactory.Instance);

  /// <summary>Creates the orchestration service with a merchant-classification failure.</summary>
  internal static AnalysisOrchestrationService CreateService(Exception merchantClassificationException) =>
    new(
      new UnsupportedAnalysisRunFoundationService(),
      new SuccessfulDocumentAnalysisFoundationService(),
      new SuccessfulGenerativeAnalysisFoundationService(merchantClassificationException),
      NullLoggerFactory.Instance);

  /// <summary>Creates the orchestration service with a run-foundation failure.</summary>
  internal static AnalysisOrchestrationService CreateRunFailureService(Exception runFoundationException) =>
    new(
      new ThrowingAnalysisRunFoundationService(runFoundationException),
      new SuccessfulDocumentAnalysisFoundationService(),
      new SuccessfulGenerativeAnalysisFoundationService(),
      NullLoggerFactory.Instance);

  /// <summary>Creates an invoice analysis run carrying the given option set.</summary>
  internal static AnalysisRun CreateInvoiceRun(InvoiceAnalysisOptions options) =>
    AnalysisRun.CreateInvoice(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), options, traceParent: null);

  /// <summary>Creates a merchant analysis run carrying the given option set.</summary>
  internal static AnalysisRun CreateMerchantRun(MerchantAnalysisOptions options) =>
    AnalysisRun.CreateMerchant(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), options, traceParent: null);

  /// <summary>Creates a minimal invoice aggregate for analysis tests.</summary>
  internal static Invoice CreateInvoice() => new() { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

  /// <summary>Creates a minimal merchant aggregate for analysis tests.</summary>
  internal static Merchant CreateMerchant() => new() { id = Guid.NewGuid(), Name = "Test Merchant" };

  private static ReceiptExtractionResult CreateExtractionResult() =>
    new(
      new MerchantCandidate("Test Merchant", "1 Test Street", "+40700000000", 0.9, 0.8, 0.7),
      [new ExtractedProduct("Lapte", 1m, "l", "SKU-001", 5.5m, 0.95)],
      new PaymentInformation(),
      "receipt",
      "RO",
      [],
      []);

  private static ProductClassificationResult CreateClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["product-0000"] = CreateClassification(ClassificationSystem.Gs1Gpc, "10000025", "Milk (Perishable)"),
    });

  private static ProductAllergenAssessmentResult CreateAllergens() =>
    new(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
    {
      ["product-0000"] = ProductAllergenAssessment.NoSignalsInAvailableEvidence(),
    });

  private static InvoiceClassificationResult CreateInvoiceClassification() =>
    new(CreateClassification(ClassificationSystem.EcoicopV2, "01.1.1", "Bread and cereals"));

  private static InvoiceSummaryResult CreateSummary() => new("Grocery run", "A small grocery purchase.");

  private static MerchantClassificationResult CreateMerchantClassification() =>
    new(CreateClassification(ClassificationSystem.Nace21, "47.11", "Retail sale in non-specialised stores"));

  private static MerchantDescriptionResult CreateMerchantDescription() => new("A neighborhood grocery store.");

  private static RecipeGenerationResult CreateRecipes() =>
    new(
      [
        new RecipeSuggestion(
          "Warm Milk",
          "A simple warm milk drink.",
          servings: 1,
          preparationMinutes: 2,
          cookingMinutes: 3,
          totalMinutes: 5,
          RecipeDifficulty.Easy,
          purchasedIngredients: [new RecipeIngredient("Milk", "1 l", preparation: null)],
          assumedPantryStaples: [],
          missingOptionalIngredients: [],
          steps: [new RecipeStep(1, "Heat milk gently in a saucepan.", notes: null)],
          allergenWarnings: [AllergenCode.Milk],
          sourceRunId: Guid.NewGuid()),
      ]);

  private static StandardClassification CreateClassification(ClassificationSystem system, string code, string label) =>
    new(
      system,
      "2026-05",
      code,
      label,
      [new ClassificationNode("root", code, label)],
      ClassificationOrigin.Analysis,
      0.9,
      [new ClassificationEvidence("subject.description", label)]);

  /// <summary>Throws the same exception from every run-foundation method.</summary>
  private sealed class ThrowingAnalysisRunFoundationService(Exception exception) : IAnalysisRunFoundationService
  {
    public Task EnsureStoreAsync(CancellationToken cancellationToken) => Task.FromException(exception);

    public Task<AnalysisRun> CreateRunAsync(AnalysisRun run, CancellationToken cancellationToken) => Task.FromException<AnalysisRun>(exception);

    public Task<AnalysisRun?> ClaimNextRunAsync(string leaseOwner, DateTimeOffset now, TimeSpan leaseDuration, CancellationToken cancellationToken) =>
      Task.FromException<AnalysisRun?>(exception);

    public Task<IReadOnlyDictionary<AnalysisTargetType, long>> CountPendingRunsAsync(DateTimeOffset now, CancellationToken cancellationToken) =>
      Task.FromException<IReadOnlyDictionary<AnalysisTargetType, long>>(exception);

    public Task<AnalysisRun> RenewLeaseAsync(Guid runId, string leaseOwner, DateTimeOffset now, TimeSpan leaseDuration, CancellationToken cancellationToken) =>
      Task.FromException<AnalysisRun>(exception);

    public Task<AnalysisRun> CompleteRunAsync(
      Guid runId,
      string leaseOwner,
      IReadOnlyCollection<AnalysisCapability> completedCapabilities,
      DateTimeOffset completedAt,
      CancellationToken cancellationToken) => Task.FromException<AnalysisRun>(exception);

    public Task<AnalysisRun> FailRunAsync(Guid runId, string leaseOwner, string failureCode, DateTimeOffset failedAt, CancellationToken cancellationToken) =>
      Task.FromException<AnalysisRun>(exception);
  }

  /// <summary>Rejects accidental run-foundation use from best-effort capability tests.</summary>
  private sealed class UnsupportedAnalysisRunFoundationService : IAnalysisRunFoundationService
  {
    public Task EnsureStoreAsync(CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<AnalysisRun> CreateRunAsync(AnalysisRun run, CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<AnalysisRun?> ClaimNextRunAsync(string leaseOwner, DateTimeOffset now, TimeSpan leaseDuration, CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    public Task<IReadOnlyDictionary<AnalysisTargetType, long>> CountPendingRunsAsync(DateTimeOffset now, CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    public Task<AnalysisRun> RenewLeaseAsync(Guid runId, string leaseOwner, DateTimeOffset now, TimeSpan leaseDuration, CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    public Task<AnalysisRun> CompleteRunAsync(
      Guid runId,
      string leaseOwner,
      IReadOnlyCollection<AnalysisCapability> completedCapabilities,
      DateTimeOffset completedAt,
      CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<AnalysisRun> FailRunAsync(Guid runId, string leaseOwner, string failureCode, DateTimeOffset failedAt, CancellationToken cancellationToken) =>
      throw new NotSupportedException();
  }

  /// <summary>Returns a deterministic receipt extraction result.</summary>
  private sealed class SuccessfulDocumentAnalysisFoundationService : IDocumentAnalysisFoundationService
  {
    public Task<ReceiptExtractionResult> ExtractInvoiceAsync(IReadOnlyList<InvoiceScan> scans, CancellationToken cancellationToken) =>
      Task.FromResult(CreateExtractionResult());
  }

  /// <summary>Returns deterministic generative-analysis results, optionally failing merchant classification.</summary>
  private sealed class SuccessfulGenerativeAnalysisFoundationService(Exception? merchantClassificationException = null) : IGenerativeAnalysisFoundationService
  {
    public Task<ProductClassificationResult> ClassifyProductsAsync(IReadOnlyList<ProductAnalysisInput> products, CancellationToken cancellationToken) =>
      Task.FromResult(CreateClassifications());

    public Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
      ReceiptExtractionResult extraction,
      ProductClassificationResult products,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Task.FromResult(CreateInvoiceClassification());

    public Task<MerchantClassificationResult> ClassifyMerchantAsync(Merchant merchant, Guid sourceRunId, CancellationToken cancellationToken)
    {
      if (merchantClassificationException is not null)
      {
        return Task.FromException<MerchantClassificationResult>(merchantClassificationException);
      }

      return Task.FromResult(CreateMerchantClassification());
    }

    public Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(Merchant merchant, Guid sourceRunId, CancellationToken cancellationToken) =>
      Task.FromResult(CreateMerchantDescription());

    public Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Task.FromResult(CreateSummary());

    public Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      ProductClassificationResult classifications,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Task.FromResult(CreateAllergens());

    public Task<RecipeGenerationResult> GenerateRecipesAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      ProductClassificationResult classifications,
      ProductAllergenAssessmentResult allergens,
      int maximumRecipes,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Task.FromResult(CreateRecipes());
  }
}
