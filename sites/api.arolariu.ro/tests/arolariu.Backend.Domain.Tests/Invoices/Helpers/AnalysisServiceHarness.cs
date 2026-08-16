namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
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
/// Wires an <see cref="AnalysisOrchestrationService"/> to hand-rolled, order-preserving capability fakes for
/// DAG-ordering and best-effort-failure tests.
/// </summary>
/// <remarks>
/// <para><see cref="CompletedCapabilities"/> is the harness's own instrumentation list, populated by the fakes at
/// the moment each capability call is invoked. It is intentionally distinct from the production
/// <see cref="InvoiceAnalysisResult.CompletedCapabilities"/> / <see cref="MerchantAnalysisResult.CompletedCapabilities"/>
/// enum collections returned by the service under test: this list captures call order using human-readable labels
/// so DAG ordering assertions read naturally, decoupled from the production <c>AnalysisCapability</c> enum shape.</para>
/// <para>The fakes never internally <c>await</c> a non-completed task, so two "concurrent" DAG steps still append to
/// <see cref="CompletedCapabilities"/> in the exact source-code call order the service under test used to start
/// them (before awaiting either) — this lets ordering assertions be deterministic without a real race.</para>
/// </remarks>
internal sealed class AnalysisServiceHarness
{
  private static readonly IReadOnlySet<string> NoFailures = new HashSet<string>(StringComparer.Ordinal);

  private readonly List<string> completedCapabilities = [];

  private AnalysisServiceHarness(AnalysisRun run, Invoice invoice, Merchant merchant, IReadOnlySet<string> failingCapabilities)
  {
    Run = run;
    Invoice = invoice;
    Merchant = merchant;

    var documentAnalysis = new FakeDocumentAnalysisFoundationService(
      completedCapabilities,
      failingCapabilities,
      CreateExtractionResult());

    var generativeAnalysis = new FakeGenerativeAnalysisFoundationService(
      completedCapabilities,
      failingCapabilities,
      CreateClassifications(),
      CreateAllergens(),
      CreateInvoiceClassification(),
      CreateSummary(),
      CreateMerchantClassification(),
      CreateMerchantDescription(),
      CreateRecipes());

    Service = new AnalysisOrchestrationService(
      new ThrowingAnalysisRunFoundationService(),
      documentAnalysis,
      generativeAnalysis,
      NullLoggerFactory.Instance);
  }

  /// <summary>Gets the orchestration service under test.</summary>
  public AnalysisOrchestrationService Service { get; }

  /// <summary>Gets the analysis run supplied to the service under test.</summary>
  public AnalysisRun Run { get; }

  /// <summary>Gets the invoice supplied to <see cref="ExecuteInvoiceAsync"/>.</summary>
  public Invoice Invoice { get; }

  /// <summary>Gets the merchant supplied to <see cref="ExecuteMerchantAsync"/>.</summary>
  public Merchant Merchant { get; }

  /// <summary>Gets the harness's own call-order instrumentation, populated as fakes are invoked.</summary>
  public IReadOnlyList<string> CompletedCapabilities => completedCapabilities;

  /// <summary>
  /// Creates a harness wired for the comprehensive invoice analysis profile with every capability succeeding.
  /// </summary>
  /// <returns>A harness ready to execute the full invoice DAG.</returns>
  public static AnalysisServiceHarness Comprehensive() =>
    ForInvoice(InvoiceAnalysisOptions.Comprehensive(), NoFailures);

  /// <summary>
  /// Creates a harness wired for the comprehensive invoice analysis profile where allergen assessment fails.
  /// </summary>
  /// <returns>A harness whose allergen assessment call throws a typed analysis-foundation exception.</returns>
  public static AnalysisServiceHarness WithFailedAllergens() =>
    ForInvoice(InvoiceAnalysisOptions.Comprehensive(), new HashSet<string>(StringComparer.Ordinal) { "allergens" });

  /// <summary>
  /// Creates a harness wired for the fast invoice analysis profile with every capability succeeding.
  /// </summary>
  /// <returns>A harness ready to execute the fast invoice DAG.</returns>
  public static AnalysisServiceHarness Fast() =>
    ForInvoice(InvoiceAnalysisOptions.Fast(), NoFailures);

  /// <summary>
  /// Creates a harness wired for the balanced invoice analysis profile with every capability succeeding.
  /// </summary>
  /// <returns>A harness ready to execute the balanced invoice DAG.</returns>
  public static AnalysisServiceHarness Balanced() =>
    ForInvoice(InvoiceAnalysisOptions.Balanced(), NoFailures);

  /// <summary>
  /// Creates a harness wired for the given invoice analysis options, optionally scripting capability failures.
  /// </summary>
  /// <param name="options">The invoice analysis options to persist on the harness's run.</param>
  /// <param name="failingCapabilities">The capability labels that should throw a typed analysis-foundation exception.</param>
  /// <returns>A configured harness.</returns>
  public static AnalysisServiceHarness ForInvoice(InvoiceAnalysisOptions options, IReadOnlySet<string> failingCapabilities) =>
    new(
      AnalysisRun.CreateInvoice(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), options, traceParent: null),
      CreateInvoiceEntity(),
      CreateMerchantEntity(),
      failingCapabilities);

  /// <summary>
  /// Creates a harness wired for the comprehensive merchant analysis profile with every capability succeeding.
  /// </summary>
  /// <returns>A harness ready to execute the full merchant DAG.</returns>
  public static AnalysisServiceHarness ComprehensiveMerchant() =>
    ForMerchant(MerchantAnalysisOptions.Comprehensive(), NoFailures);

  /// <summary>
  /// Creates a harness wired for the given merchant analysis options, optionally scripting capability failures.
  /// </summary>
  /// <param name="options">The merchant analysis options to persist on the harness's run.</param>
  /// <param name="failingCapabilities">The capability labels that should throw a typed analysis-foundation exception.</param>
  /// <returns>A configured harness.</returns>
  public static AnalysisServiceHarness ForMerchant(MerchantAnalysisOptions options, IReadOnlySet<string> failingCapabilities) =>
    new(
      AnalysisRun.CreateMerchant(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), options, traceParent: null),
      CreateInvoiceEntity(),
      CreateMerchantEntity(),
      failingCapabilities);

  /// <summary>
  /// Executes the invoice analysis DAG against <see cref="Invoice"/> using <see cref="Run"/>.
  /// </summary>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The best-effort invoice analysis result.</returns>
  public Task<InvoiceAnalysisResult> ExecuteInvoiceAsync(CancellationToken cancellationToken = default) =>
    Service.AnalyzeInvoiceAsync(Run, Invoice, cancellationToken);

  /// <summary>
  /// Executes the merchant analysis DAG against <see cref="Merchant"/> using <see cref="Run"/>.
  /// </summary>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The best-effort merchant analysis result.</returns>
  public Task<MerchantAnalysisResult> ExecuteMerchantAsync(CancellationToken cancellationToken = default) =>
    Service.AnalyzeMerchantAsync(Run, Merchant, cancellationToken);

  private static Invoice CreateInvoiceEntity() => new() { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid() };

  private static Merchant CreateMerchantEntity() => new() { id = Guid.NewGuid(), Name = "Test Merchant" };

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
      ["product-0000"] = ProductAllergenAssessment.SignalsFound(
        [
          new ProductAllergenSignal(
            AllergenCode.Milk,
            ProductAllergenEvidenceTier.Declared,
            0.9,
            [new AllergenEvidence("ingredientsText", "lapte")]),
        ]),
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
          sourceRunId: Guid.CreateVersion7()),
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

  private sealed class ThrowingAnalysisRunFoundationService : IAnalysisRunFoundationService
  {
    public Task EnsureStoreAsync(CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<AnalysisRun> CreateRunAsync(AnalysisRun run, CancellationToken cancellationToken) => throw new NotSupportedException();

    public Task<AnalysisRun?> ClaimNextRunAsync(string leaseOwner, DateTimeOffset now, TimeSpan leaseDuration, CancellationToken cancellationToken) =>
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

  private sealed class FakeDocumentAnalysisFoundationService(
    List<string> completedCapabilities,
    IReadOnlySet<string> failingCapabilities,
    ReceiptExtractionResult result) : IDocumentAnalysisFoundationService
  {
    public Task<ReceiptExtractionResult> ExtractInvoiceAsync(IReadOnlyList<InvoiceScan> scans, CancellationToken cancellationToken) =>
      Complete("document", result);

    private Task<TResult> Complete<TResult>(string capability, TResult result)
      where TResult : notnull
    {
      if (failingCapabilities.Contains(capability))
      {
        throw new AnalysisFoundationServiceException(new InvalidOperationException($"Scripted failure for '{capability}'."));
      }

      completedCapabilities.Add(capability);
      return Task.FromResult(result);
    }
  }

  private sealed class FakeGenerativeAnalysisFoundationService(
    List<string> completedCapabilities,
    IReadOnlySet<string> failingCapabilities,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens,
    InvoiceClassificationResult invoiceClassification,
    InvoiceSummaryResult summary,
    MerchantClassificationResult merchantClassification,
    MerchantDescriptionResult merchantDescription,
    RecipeGenerationResult recipes) : IGenerativeAnalysisFoundationService
  {
    public Task<ProductClassificationResult> ClassifyProductsAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      CancellationToken cancellationToken) => Complete("product-classification", classifications);

    public Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
      ReceiptExtractionResult extraction,
      ProductClassificationResult products,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Complete("invoice-classification", invoiceClassification);

    public Task<MerchantClassificationResult> ClassifyMerchantAsync(
      Merchant merchant,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Complete("merchant-classification", merchantClassification);

    public Task<MerchantDescriptionResult> GenerateMerchantDescriptionAsync(
      Merchant merchant,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Complete("description-generation", merchantDescription);

    public Task<InvoiceSummaryResult> GenerateInvoiceSummaryAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Complete("summary", summary);

    public Task<ProductAllergenAssessmentResult> AssessAllergensAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      ProductClassificationResult classifications,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Complete("allergens", allergens);

    public Task<RecipeGenerationResult> GenerateRecipesAsync(
      IReadOnlyList<ProductAnalysisInput> products,
      ProductClassificationResult classifications,
      ProductAllergenAssessmentResult allergens,
      int maximumRecipes,
      Guid sourceRunId,
      CancellationToken cancellationToken) => Complete("recipes", recipes);

    private Task<TResult> Complete<TResult>(string capability, TResult result)
      where TResult : notnull
    {
      if (failingCapabilities.Contains(capability))
      {
        throw new AnalysisFoundationServiceException(new InvalidOperationException($"Scripted failure for '{capability}'."));
      }

      completedCapabilities.Add(capability);
      return Task.FromResult(result);
    }
  }
}
