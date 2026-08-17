namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Verifies generative analysis foundation activities record expected tags when an invoice ActivityListener is present.
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class GenerativeAnalysisActivityTests
{
  /// <summary>
  /// Verifies weak merchant evidence with no classification records null-classification and weak-evidence tags.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_WeakEvidenceWithoutClassification_RecordsWeakEvidenceTags()
  {
    Guid sourceRunId = Guid.CreateVersion7();
    Merchant merchant = new()
    {
      Name = "Market",
      Description = string.Empty,
      Classification = null,
      Address = new ContactInformation(),
      ParentCompanyId = Guid.Empty,
      ReferencedInvoices = [],
    };
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithResponse(
      "Market likely sells grocery products.",
      merchant,
      sourceRunId);
    using var recorder = new InvoiceActivityRecorder();

    MerchantDescriptionResult result = await harness.ExecuteAsync().ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(harness.Service.GenerateMerchantDescriptionAsync));
    Assert.AreEqual("Market likely sells grocery products.", result.Description);
    Assert.AreEqual(sourceRunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.source_run_id"));
    Assert.AreEqual("0", InvoiceActivityRecorder.TagValue(activity, "analysis.referenced_invoice_count"));
    Assert.AreEqual("False", InvoiceActivityRecorder.TagValue(activity, "analysis.has_parent_company"));
    Assert.IsNull(InvoiceActivityRecorder.TagValue(activity, "analysis.classification"));
    Assert.AreEqual("weak", InvoiceActivityRecorder.TagValue(activity, "analysis.merchant_evidence_strength"));
  }

  /// <summary>
  /// Verifies supported merchant evidence with classification records classification and supported-evidence tags.
  /// </summary>
  [TestMethod]
  public async Task GenerateMerchantDescriptionAsync_SupportedEvidenceWithClassification_RecordsSupportedEvidenceTags()
  {
    Guid sourceRunId = Guid.CreateVersion7();
    Merchant merchant = CreateSupportedMerchant();
    MerchantDescriptionHarness harness = MerchantDescriptionHarness.WithResponse(
      "Corner Shop sells groceries.",
      merchant,
      sourceRunId);
    using var recorder = new InvoiceActivityRecorder();

    MerchantDescriptionResult result = await harness.ExecuteAsync().ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(harness.Service.GenerateMerchantDescriptionAsync));
    Assert.AreEqual("Corner Shop sells groceries.", result.Description);
    Assert.AreEqual(sourceRunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.source_run_id"));
    Assert.AreEqual("1", InvoiceActivityRecorder.TagValue(activity, "analysis.referenced_invoice_count"));
    Assert.AreEqual("True", InvoiceActivityRecorder.TagValue(activity, "analysis.has_parent_company"));
    Assert.AreEqual("47.11", InvoiceActivityRecorder.TagValue(activity, "analysis.classification"));
    Assert.AreEqual("supported", InvoiceActivityRecorder.TagValue(activity, "analysis.merchant_evidence_strength"));
  }

  /// <summary>
  /// Verifies recipe generation records source-run, product-count, and recipe-limit tags.
  /// </summary>
  [TestMethod]
  public async Task GenerateRecipesAsync_RecorderActive_RecordsRecipeTags()
  {
    Guid sourceRunId = Guid.CreateVersion7();
    var response = new GenerativeService.RecipeGenerationStructuredResult([CreateRecipe()]);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);
    using var recorder = new InvoiceActivityRecorder();

    RecipeGenerationResult result = await harness.Service.GenerateRecipesAsync(
      CreateProducts(),
      CreateFoodClassifications(),
      CreateAllergenAssessments(),
      maximumRecipes: 2,
      sourceRunId,
      CancellationToken.None).ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(harness.Service.GenerateRecipesAsync));
    Assert.AreEqual(1, result.Recipes.Count);
    Assert.AreEqual(sourceRunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.source_run_id"));
    Assert.AreEqual("1", InvoiceActivityRecorder.TagValue(activity, "analysis.product_count"));
    Assert.AreEqual("2", InvoiceActivityRecorder.TagValue(activity, "analysis.maximum_recipes"));
  }

  /// <summary>
  /// Verifies allergen assessment records source-run and product-count tags.
  /// </summary>
  [TestMethod]
  public async Task AssessAllergensAsync_RecorderActive_RecordsAllergenTags()
  {
    Guid sourceRunId = Guid.CreateVersion7();
    var response = new GenerativeService.AllergenAssessmentBatchStructuredResult(
    [
      new GenerativeService.AllergenAssessmentStructuredEntry(
        "item-0001",
        nameof(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence),
        []),
    ]);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);
    using var recorder = new InvoiceActivityRecorder();

    ProductAllergenAssessmentResult result = await harness.Service.AssessAllergensAsync(
      CreateProducts(),
      CreateFoodClassifications(),
      sourceRunId,
      CancellationToken.None).ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(harness.Service.AssessAllergensAsync));
    Assert.AreEqual(1, result.Assessments.Count);
    Assert.AreEqual(sourceRunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.source_run_id"));
    Assert.AreEqual("1", InvoiceActivityRecorder.TagValue(activity, "analysis.product_count"));
  }

  /// <summary>
  /// Verifies invoice summary generation records source-run and product-count tags.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_RecorderActive_RecordsSummaryTags()
  {
    Guid sourceRunId = Guid.CreateVersion7();
    var response = new GenerativeService.InvoiceSummaryStructuredResult("Weekly groceries", "Milk for breakfast.");
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);
    using var recorder = new InvoiceActivityRecorder();

    InvoiceSummaryResult result = await harness.Service.GenerateInvoiceSummaryAsync(
      CreateProducts(),
      sourceRunId,
      CancellationToken.None).ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(harness.Service.GenerateInvoiceSummaryAsync));
    Assert.AreEqual("Weekly groceries", result.Name);
    Assert.AreEqual(sourceRunId.ToString(), InvoiceActivityRecorder.TagValue(activity, "analysis.source_run_id"));
    Assert.AreEqual("1", InvoiceActivityRecorder.TagValue(activity, "analysis.product_count"));
  }

  /// <summary>
  /// Verifies every generative capability records its immutable schema and prompt identifiers, while
  /// classification capabilities use the version from their selected trusted taxonomy artifact and all other
  /// capabilities use the bounded non-taxonomy sentinel.
  /// </summary>
  [TestMethod]
  public async Task GenerativeCapabilities_RecorderActive_RecordsBoundedSchemaPromptAndTaxonomyVersions()
  {
    Guid invoiceRunId = Guid.CreateVersion7();
    Guid merchantRunId = Guid.CreateVersion7();
    IReadOnlyList<ProductAnalysisInput> products = CreateProducts();
    ProductClassificationResult classifications = CreateFoodClassifications();
    ProductAllergenAssessmentResult allergens = CreateAllergenAssessments();

    var summaryBroker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(new GenerativeService.InvoiceSummaryStructuredResult(
        "Weekly groceries",
        "Milk for breakfast.")));
    GenerativeClassificationHarness summaryHarness = GenerativeClassificationHarness.Create(summaryBroker);

    var allergenBroker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(new GenerativeService.AllergenAssessmentBatchStructuredResult(
      [
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence),
          []),
      ])));
    GenerativeClassificationHarness allergenHarness = GenerativeClassificationHarness.Create(allergenBroker);

    var recipeBroker = new ScriptedGenerativeAiBroker(
      ScriptedGenerativeAiBroker.Success(new GenerativeService.RecipeGenerationStructuredResult([CreateRecipe()])));
    GenerativeClassificationHarness recipeHarness = GenerativeClassificationHarness.Create(recipeBroker);

    MerchantDescriptionHarness descriptionHarness = MerchantDescriptionHarness.WithResponse(
      "Corner Shop sells groceries.",
      CreateSupportedMerchant(),
      merchantRunId);

    GenerativeClassificationHarness productClassificationHarness = GenerativeClassificationHarness.ForProduct(
      ["milk"],
      "10000025");
    GenerativeClassificationHarness invoiceClassificationHarness = GenerativeClassificationHarness.ForProduct(
      ["cereals"],
      "01.1.1.1",
      invoiceRunId.ToString());
    GenerativeClassificationHarness merchantClassificationHarness = GenerativeClassificationHarness.ForProduct(
      ["agriculture"],
      "A",
      merchantRunId.ToString());

    using var recorder = new InvoiceActivityRecorder();

    _ = await summaryHarness.Service.GenerateInvoiceSummaryAsync(products, invoiceRunId, CancellationToken.None).ConfigureAwait(false);
    _ = await allergenHarness.Service.AssessAllergensAsync(products, classifications, invoiceRunId, CancellationToken.None).ConfigureAwait(false);
    _ = await recipeHarness.Service.GenerateRecipesAsync(products, classifications, allergens, 2, invoiceRunId, CancellationToken.None).ConfigureAwait(false);
    _ = await descriptionHarness.ExecuteAsync().ConfigureAwait(false);
    _ = await productClassificationHarness.Service.ClassifyProductsAsync(products, CancellationToken.None).ConfigureAwait(false);
    _ = await invoiceClassificationHarness.Service.ClassifyInvoiceAsync(
      new ReceiptExtractionResult(
        merchantCandidate: null,
        products: [new ExtractedProduct("Cereals", 1m, "item", string.Empty, 5m, 0.9)],
        paymentInformation: new PaymentInformation(),
        receiptType: "SaleReceipt",
        countryRegion: "RO",
        taxDetails: [],
        payments: []),
      new ProductClassificationResult(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)),
      invoiceRunId,
      CancellationToken.None).ConfigureAwait(false);
    _ = await merchantClassificationHarness.Service.ClassifyMerchantAsync(
      CreateSupportedMerchant(),
      merchantRunId,
      CancellationToken.None).ConfigureAwait(false);

    AssertVersionTags(
      recorder,
      nameof(summaryHarness.Service.GenerateInvoiceSummaryAsync),
      "invoice-summary-schema-v1",
      "invoice-summary-prompt-v1",
      "not_applicable");
    AssertVersionTags(
      recorder,
      nameof(allergenHarness.Service.AssessAllergensAsync),
      "eu14-allergen-assessment-schema-v1",
      "eu14-allergen-assessment-prompt-v1",
      "not_applicable");
    AssertVersionTags(
      recorder,
      nameof(recipeHarness.Service.GenerateRecipesAsync),
      "basket-recipe-generation-schema-v1",
      "basket-recipe-generation-prompt-v1",
      "not_applicable");
    AssertVersionTags(
      recorder,
      nameof(descriptionHarness.Service.GenerateMerchantDescriptionAsync),
      "merchant-description-schema-v1",
      "merchant-description-prompt-v1",
      "not_applicable");
    AssertVersionTags(
      recorder,
      nameof(productClassificationHarness.Service.ClassifyProductsAsync),
      "product-classification-schema-v1",
      "product-classification-prompt-v1",
      "2026-05");
    AssertVersionTags(
      recorder,
      nameof(invoiceClassificationHarness.Service.ClassifyInvoiceAsync),
      "invoice-classification-schema-v1",
      "invoice-classification-prompt-v1",
      "2");
    AssertVersionTags(
      recorder,
      nameof(merchantClassificationHarness.Service.ClassifyMerchantAsync),
      "merchant-classification-schema-v1",
      "merchant-classification-prompt-v1",
      "2.1");
  }

  /// <summary>
  /// Verifies an activity records only normalized model and numeric token metadata alongside the bounded outcome;
  /// a provider-controlled model identifier never becomes an activity tag value.
  /// </summary>
  [TestMethod]
  public async Task GenerateInvoiceSummaryAsync_ProviderModelIsArbitrary_RecordsBoundedResponseActivityTags()
  {
    const string ProviderModelId = "provider-controlled-model-8f172fb9-9f81-4db7-b856-c38f7543b4e4";
    var response = new GenerativeService.InvoiceSummaryStructuredResult("Weekly groceries", "Milk for breakfast.");
    var broker = new ScriptedGenerativeAiBroker(
      new ScriptedGenerativeAiBroker.ScriptedGenerativeResponse(
        response,
        TimeSpan.Zero,
        null,
        ProviderModelId,
        new GenerativeUsage(31, 13, 44)));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);
    using var recorder = new InvoiceActivityRecorder();

    _ = await harness.Service.GenerateInvoiceSummaryAsync(
      CreateProducts(),
      Guid.CreateVersion7(),
      CancellationToken.None).ConfigureAwait(false);

    Activity activity = RequireActivity(recorder, nameof(harness.Service.GenerateInvoiceSummaryAsync));
    Assert.AreEqual("unknown", InvoiceActivityRecorder.TagValue(activity, "analysis.model.id"));
    Assert.AreEqual("31", InvoiceActivityRecorder.TagValue(activity, "analysis.input_tokens"));
    Assert.AreEqual("13", InvoiceActivityRecorder.TagValue(activity, "analysis.output_tokens"));
    Assert.AreEqual("success", InvoiceActivityRecorder.TagValue(activity, "analysis.outcome"));
    Assert.IsFalse(activity.TagObjects.Any(tag => Equals(tag.Value, ProviderModelId)));
  }

  private static Merchant CreateSupportedMerchant() => new()
  {
    Name = "Corner Shop",
    Description = "Neighborhood grocery retailer.",
    Classification = new StandardClassification(
      ClassificationSystem.Nace21,
      "2.1",
      "47.11",
      "Retail sale in non-specialised stores",
      [new ClassificationNode("class", "47.11", "Retail sale in non-specialised stores")],
      ClassificationOrigin.Analysis,
      0.9,
      [new ClassificationEvidence("merchant.name", "Corner Shop")]),
    Address = new ContactInformation
    {
      Address = "Strada Exemplu 1",
    },
    ParentCompanyId = Guid.CreateVersion7(),
    ReferencedInvoices = [Guid.CreateVersion7()],
  };

  private static GenerativeService.RecipeStructuredSuggestion CreateRecipe() => new(
    "Warm milk porridge",
    "A simple warm breakfast bowl.",
    2,
    5,
    10,
    15,
    nameof(RecipeDifficulty.Easy),
    [new GenerativeService.RecipeStructuredIngredient("Milk", "1 cup", null)],
    [],
    [],
    [new GenerativeService.RecipeStructuredStep(1, "Heat the milk.", null)],
    [nameof(AllergenCode.Milk)]);

  private static List<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" })];

  private static ProductClassificationResult CreateFoodClassifications() =>
    new(new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = new StandardClassification(
        ClassificationSystem.Gs1Gpc,
        "2026-05",
        "10000025",
        "Milk (Perishable)",
        [
          new ClassificationNode("segment", "50000000", "Food/Beverage"),
          new ClassificationNode("brick", "10000025", "Milk (Perishable)"),
        ],
        ClassificationOrigin.Analysis,
        0.9,
        [new ClassificationEvidence("subject.description", "lapte")]),
    });

  private static ProductAllergenAssessmentResult CreateAllergenAssessments() =>
    new(new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
    {
      ["item-0001"] = ProductAllergenAssessment.SignalsFound(
      [
        new ProductAllergenSignal(
          AllergenCode.Milk,
          ProductAllergenEvidenceTier.Likely,
          0.98,
          [new AllergenEvidence("productName", "milk")]),
      ]),
    });

  private static Activity RequireActivity(InvoiceActivityRecorder recorder, string operationName)
  {
    Activity? activity = recorder.FindActivity(operationName);

    if (activity is not null)
    {
      return activity;
    }

    throw new AssertFailedException($"Activity '{operationName}' was not recorded.");
  }

  private static void AssertVersionTags(
    InvoiceActivityRecorder recorder,
    string operationName,
    string schemaVersion,
    string promptVersion,
    string taxonomyVersion)
  {
    Activity activity = RequireActivity(recorder, operationName);

    Assert.AreEqual(schemaVersion, InvoiceActivityRecorder.TagValue(activity, "analysis.schema.version"));
    Assert.AreEqual(promptVersion, InvoiceActivityRecorder.TagValue(activity, "analysis.prompt.version"));
    Assert.AreEqual(taxonomyVersion, InvoiceActivityRecorder.TagValue(activity, "analysis.taxonomy.version"));
  }
}
