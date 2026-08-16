namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
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
/// Verifies structured allergen assessment behavior for the generative analysis foundation service.
/// </summary>
[TestClass]
public sealed class AllergenGenerationTests
{
  /// <summary>
  /// Verifies that declared allergen evidence is rejected for Task 7 regardless of the labeled evidence source.
  /// </summary>
  [TestMethod]
  [DataRow("productName")]
  [DataRow("ingredientsText")]
  [DataRow("allergenStatement")]
  public async Task AssessAllergensAsync_DeclaredEvidenceTier_ThrowsDependencyException(string evidenceSource)
  {
    var harness = GenerativeCapabilityHarness.WithAllergenSignal(
      AllergenCode.Milk,
      ProductAllergenEvidenceTier.Declared,
      evidenceSource);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.AssessAllergensAsync(
        harness.Products,
        harness.Classifications,
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }

  /// <summary>
  /// Verifies that a successful empty allergen section maps to the explicit no-signals status.
  /// </summary>
  [TestMethod]
  public async Task AssessAllergensAsync_EmptySuccessfulResponse_ReturnsNoSignals()
  {
    var harness = GenerativeCapabilityHarness.EmptyAllergenSuccess();

    ProductAllergenAssessmentResult result = await harness.Service.AssessAllergensAsync(
      harness.Products,
      harness.Classifications,
      Guid.NewGuid(),
      CancellationToken.None);

    Assert.AreEqual(
      ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence,
      result.Assessments["item-0001"].Status);
  }

  /// <summary>
  /// Verifies that only exact EU-14 allergen codes are accepted from structured output.
  /// </summary>
  [TestMethod]
  public async Task AssessAllergensAsync_NonEu14Alias_ThrowsDependencyException()
  {
    var response = new GenerativeService.AllergenAssessmentBatchStructuredResult(
      [
        new GenerativeService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "SignalsFound",
          [
            new GenerativeService.AllergenSignalStructuredEntry(
              "Shellfish",
              "Likely",
              0.67,
              [
                new GenerativeService.AllergenEvidenceStructuredEntry(
                  "productName",
                  "seafood mix")
              ])
          ])
      ]);

    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));
    var harness = GenerativeClassificationHarness.Create(broker);

    var exception = await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
      () => harness.Service.AssessAllergensAsync(
        [new ProductAnalysisInput("item-0001", new Product { Name = "seafood mix" })],
        new ProductClassificationResult(new System.Collections.Generic.Dictionary<string, StandardClassification>(System.StringComparer.Ordinal)
        {
          ["item-0001"] = new StandardClassification(
            ClassificationSystem.Gs1Gpc,
            "2026-05",
            "10000025",
            "Milk (Perishable)",
            [
              new ClassificationNode("segment", "50000000", "Food/Beverage"),
              new ClassificationNode("family", "50130000", "Milk/Butter/Cream/Yogurts/Cheese/Eggs/Substitutes"),
              new ClassificationNode("class", "50131700", "Milk/Milk Substitutes"),
              new ClassificationNode("brick", "10000025", "Milk (Perishable)"),
            ],
            ClassificationOrigin.Analysis,
            0.81,
            [new ClassificationEvidence("subject.description", "seafood mix")])
        }),
        Guid.NewGuid(),
        CancellationToken.None));

    Assert.IsInstanceOfType<InvalidStructuredOutputException>(exception.InnerException);
  }
}
