namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using GenerativeService = arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis.GenerativeAnalysisFoundationService;

/// <summary>
/// Verifies allergen structured-output mapping branches.
/// </summary>
[TestClass]
public sealed class GenerativeAnalysisAllergenMappingTests
{
  /// <summary>
  /// Verifies supported empty-signal statuses map to empty allergen assessments.
  /// </summary>
  [TestMethod]
  [DataRow(nameof(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence))]
  [DataRow(nameof(ProductAllergenAssessmentStatus.InsufficientData))]
  public async Task AssessAllergensAsync_EmptySignalStatuses_ReturnEmptyAssessments(string status)
  {
    ProductAllergenAssessmentResult result = await ExecuteAssessmentAsync(
      new GenerativeService.AllergenAssessmentStructuredEntry("item-0001", status, []));

    Assert.AreEqual(status, result.Assessments["item-0001"].Status.ToString());
    Assert.AreEqual(0, result.Assessments["item-0001"].Signals.Count);
  }

  /// <summary>
  /// Verifies likely and possible evidence tiers are parsed into allergen signals.
  /// </summary>
  [TestMethod]
  [DataRow(nameof(ProductAllergenEvidenceTier.Likely))]
  [DataRow(nameof(ProductAllergenEvidenceTier.Possible))]
  public async Task AssessAllergensAsync_SupportedEvidenceTier_ReturnsSignal(string evidenceTier)
  {
    ProductAllergenAssessmentResult result = await ExecuteAssessmentAsync(
      new GenerativeService.AllergenAssessmentStructuredEntry(
        "item-0001",
        nameof(ProductAllergenAssessmentStatus.SignalsFound),
        [CreateSignal(evidenceTier: evidenceTier)]));

    Assert.AreEqual(ProductAllergenAssessmentStatus.SignalsFound, result.Assessments["item-0001"].Status);
    Assert.AreEqual(evidenceTier, result.Assessments["item-0001"].Signals[0].EvidenceTier.ToString());
  }

  /// <summary>
  /// Verifies null assessment signals are rejected before status mapping succeeds.
  /// </summary>
  [TestMethod]
  public async Task AssessAllergensAsync_NullSignals_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence),
          null!)));
  }

  /// <summary>
  /// Verifies non-empty signals are rejected for empty-signal statuses.
  /// </summary>
  [TestMethod]
  [DataRow(nameof(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence))]
  [DataRow(nameof(ProductAllergenAssessmentStatus.InsufficientData))]
  public async Task AssessAllergensAsync_EmptySignalStatusWithSignal_ThrowsDependencyException(string status)
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(new GenerativeService.AllergenAssessmentStructuredEntry("item-0001", status, [CreateSignal()])));
  }

  /// <summary>
  /// Verifies unsupported and blank assessment status values are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  [DataRow("Unknown")]
  public async Task AssessAllergensAsync_InvalidStatus_ThrowsDependencyException(string? status)
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(new GenerativeService.AllergenAssessmentStructuredEntry("item-0001", status!, [])));
  }

  /// <summary>
  /// Verifies invalid allergen code values are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  [DataRow("milk")]
  [DataRow("Unknown")]
  public async Task AssessAllergensAsync_InvalidSignalCode_ThrowsDependencyException(string? code)
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.SignalsFound),
          [CreateSignal(code: code!)])));
  }

  /// <summary>
  /// Verifies invalid evidence tier values, including the declared tier and wrong casing, are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  [DataRow(nameof(ProductAllergenEvidenceTier.Declared))]
  [DataRow("likely")]
  [DataRow("Unknown")]
  public async Task AssessAllergensAsync_InvalidEvidenceTier_ThrowsDependencyException(string? evidenceTier)
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.SignalsFound),
          [CreateSignal(evidenceTier: evidenceTier!)])));
  }

  /// <summary>
  /// Verifies null signal evidence collections are rejected.
  /// </summary>
  [TestMethod]
  public async Task AssessAllergensAsync_NullSignalEvidence_ThrowsDependencyException()
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.SignalsFound),
          [CreateSignal() with { Evidence = null! }])));
  }

  /// <summary>
  /// Verifies blank and unsupported evidence sources are rejected.
  /// </summary>
  [TestMethod]
  [DataRow(null)]
  [DataRow("")]
  [DataRow("   ")]
  [DataRow("receiptLine")]
  public async Task AssessAllergensAsync_InvalidEvidenceSource_ThrowsDependencyException(string? source)
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.SignalsFound),
          [CreateSignal(evidence: [new GenerativeService.AllergenEvidenceStructuredEntry(source!, "lapte")])])));
  }

  /// <summary>
  /// Verifies blank evidence values are rejected for every allowed evidence source.
  /// </summary>
  [TestMethod]
  [DataRow("productName", null)]
  [DataRow("ingredientsText", "")]
  [DataRow("allergenStatement", "   ")]
  public async Task AssessAllergensAsync_BlankEvidenceValue_ThrowsDependencyException(string source, string? value)
  {
    await AssertInvalidStructuredOutputAsync(
      () => ExecuteAssessmentAsync(
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          nameof(ProductAllergenAssessmentStatus.SignalsFound),
          [CreateSignal(evidence: [new GenerativeService.AllergenEvidenceStructuredEntry(source, value!)])])));
  }

  private static async Task<ProductAllergenAssessmentResult> ExecuteAssessmentAsync(
    GenerativeService.AllergenAssessmentStructuredEntry entry)
  {
    var response = new GenerativeService.AllergenAssessmentBatchStructuredResult([entry]);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));
    GenerativeClassificationHarness harness = GenerativeClassificationHarness.Create(broker);

    return await harness.Service.AssessAllergensAsync(
      CreateProducts(),
      CreateProductClassifications(),
      Guid.NewGuid(),
      CancellationToken.None);
  }

  private static GenerativeService.AllergenSignalStructuredEntry CreateSignal(
    string code = nameof(AllergenCode.Milk),
    string evidenceTier = nameof(ProductAllergenEvidenceTier.Likely),
    IReadOnlyList<GenerativeService.AllergenEvidenceStructuredEntry>? evidence = null) =>
    new(
      code,
      evidenceTier,
      0.85,
      evidence ?? [new GenerativeService.AllergenEvidenceStructuredEntry("productName", "lapte")]);

  private static List<ProductAnalysisInput> CreateProducts() =>
    [new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" })];

  private static ProductClassificationResult CreateProductClassifications() =>
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

  private static async Task AssertInvalidStructuredOutputAsync(Func<Task> action)
  {
    AnalysisFoundationDependencyException exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(action);
    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }
}

