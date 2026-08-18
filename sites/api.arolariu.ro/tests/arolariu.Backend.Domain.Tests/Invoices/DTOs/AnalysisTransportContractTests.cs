namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the strict JSON transport contract for analysis API requests, acknowledgements, and result values.
/// </summary>
[TestClass]
public sealed class AnalysisTransportContractTests
{
  private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

  /// <summary>
  /// Verifies the invoice enqueue request accepts only the published string profile and capability names.
  /// </summary>
  [TestMethod]
  public void DeserializeInvoiceAnalyzeRequest_ExactWireNames_ProducesRequest()
  {
    // Arrange
    const string json = """{"profile":"fast","overrides":{"invoiceSummary":{"enabled":false}}}""";

    // Act
    AnalyzeInvoiceRequestDto request = JsonSerializer.Deserialize<AnalyzeInvoiceRequestDto>(json, ApiJsonOptions);

    // Assert
    Assert.AreEqual(AnalysisProfile.Fast, request.Profile);
    Assert.IsNotNull(request.Overrides);
    Assert.IsNotNull(request.Overrides.Value.InvoiceSummary);
    Assert.IsFalse(request.Overrides.Value.InvoiceSummary.Value.Enabled);
  }

  /// <summary>
  /// Verifies the merchant enqueue request accepts only the published string profile and capability names.
  /// </summary>
  [TestMethod]
  public void DeserializeMerchantAnalyzeRequest_ExactWireNames_ProducesRequest()
  {
    // Arrange
    const string json = """{"profile":"comprehensive","overrides":{"descriptionGeneration":{"enabled":false}}}""";

    // Act
    AnalyzeMerchantRequestDto request = JsonSerializer.Deserialize<AnalyzeMerchantRequestDto>(json, ApiJsonOptions);

    // Assert
    Assert.AreEqual(AnalysisProfile.Comprehensive, request.Profile);
    Assert.IsNotNull(request.Overrides);
    Assert.IsNotNull(request.Overrides.Value.DescriptionGeneration);
    Assert.IsFalse(request.Overrides.Value.DescriptionGeneration.Value.Enabled);
  }

  /// <summary>
  /// Verifies enqueue acknowledgements use the exact string values expected by API consumers.
  /// </summary>
  [TestMethod]
  public void SerializeAnalysisAcceptedResponse_AnalysisEnums_UsesExactWireNames()
  {
    // Arrange
    Guid runId = Guid.Parse("11111111-1111-7111-8111-111111111111");
    Guid targetId = Guid.Parse("22222222-2222-7222-8222-222222222222");
    var response = new AnalysisAcceptedResponseDto(
      runId,
      AnalysisTargetType.Invoice,
      targetId,
      AnalysisRunStatus.Queued,
      AnalysisProfile.Custom,
      [AnalysisCapability.DocumentExtraction, AnalysisCapability.RecipeGeneration],
      new DateTimeOffset(2026, 8, 17, 20, 0, 0, TimeSpan.Zero));

    // Act
    string json = JsonSerializer.Serialize(response, ApiJsonOptions);

    // Assert
    Assert.AreEqual(
      """{"runId":"11111111-1111-7111-8111-111111111111","targetType":"invoice","targetId":"22222222-2222-7222-8222-222222222222","status":"queued","profile":"custom","acceptedCapabilities":["documentExtraction","recipeGeneration"],"acceptedAt":"2026-08-17T20:00:00+00:00"}""",
      json);
  }

  /// <summary>
  /// Verifies analysis result values serialize their classification, allergen, and recipe enum members as strings.
  /// </summary>
  [TestMethod]
  public void SerializeAnalysisResultValues_ExposedEnums_UsesExactWireNames()
  {
    // Arrange
    Guid sourceRunId = Guid.Parse("33333333-3333-7333-8333-333333333333");
    var classification = new StandardClassification(
      ClassificationSystem.Gs1Gpc,
      "2026",
      "10000045",
      "Bread",
      [new ClassificationNode("segment", "10000045", "Bread")],
      ClassificationOrigin.Analysis,
      0.98,
      [new ClassificationEvidence("receipt", "Wholemeal loaf")]);
    AllergenAssessment assessment = AllergenAssessment.Detected(
      sourceRunId,
      [
        new AllergenSignal(
          AllergenCode.CerealsContainingGluten,
          AllergenEvidenceLevel.Explicit,
          0.99,
          [new AllergenEvidence("label", "Contains wheat")]),
      ]);
    var recipe = new RecipeSuggestion(
      "Toast",
      "Toast the bread.",
      1,
      1,
      1,
      2,
      RecipeDifficulty.Easy,
      [new RecipeIngredient("Bread", "2 slices", null)],
      [],
      [],
      [new RecipeStep(1, "Toast.", null)],
      [AllergenCode.CerealsContainingGluten],
      sourceRunId);
    var transientResult = new ProductAllergenAssessmentResult(
      new Dictionary<string, ProductAllergenAssessment>
      {
        ["line-1"] = ProductAllergenAssessment.SignalsFound(
          [
            new ProductAllergenSignal(
              AllergenCode.CerealsContainingGluten,
              ProductAllergenEvidenceTier.Declared,
              0.99,
              [new AllergenEvidence("label", "Contains wheat")]),
          ]),
      });

    // Act
    using JsonDocument document = JsonSerializer.SerializeToDocument(
      new
      {
        Classification = classification,
        Assessment = assessment,
        Recipe = recipe,
        TransientResult = transientResult,
      },
      ApiJsonOptions);

    // Assert
    JsonElement root = document.RootElement;
    Assert.AreEqual("GS1_GPC", root.GetProperty("classification").GetProperty("system").GetString());
    Assert.AreEqual("Analysis", root.GetProperty("classification").GetProperty("origin").GetString());
    Assert.AreEqual("detected", root.GetProperty("assessment").GetProperty("status").GetString());
    Assert.AreEqual(
      "cerealsContainingGluten",
      root.GetProperty("assessment").GetProperty("signals")[0].GetProperty("code").GetString());
    Assert.AreEqual(
      "explicit",
      root.GetProperty("assessment").GetProperty("signals")[0].GetProperty("evidenceLevel").GetString());
    Assert.AreEqual("easy", root.GetProperty("recipe").GetProperty("difficulty").GetString());
    Assert.AreEqual(
      "cerealsContainingGluten",
      root.GetProperty("recipe").GetProperty("allergenWarnings")[0].GetString());
    Assert.AreEqual(
      "signalsFound",
      root.GetProperty("transientResult").GetProperty("assessments").GetProperty("line-1").GetProperty("status").GetString());
    Assert.AreEqual(
      "declared",
      root.GetProperty("transientResult").GetProperty("assessments").GetProperty("line-1").GetProperty("signals")[0].GetProperty("evidenceTier").GetString());
  }

  /// <summary>
  /// Verifies every analysis transport enum writes its explicit wire name and rejects numeric JSON input.
  /// </summary>
  [TestMethod]
  public void SerializeExposedAnalysisEnums_AllMembers_UsesExplicitNamesAndRejectsNumbers()
  {
    // Arrange
    (object Value, string WireName)[] cases =
    [
      (AnalysisCapability.DocumentExtraction, "documentExtraction"),
      (AnalysisCapability.MerchantResolution, "merchantResolution"),
      (AnalysisCapability.InvoiceSummary, "invoiceSummary"),
      (AnalysisCapability.ProductClassification, "productClassification"),
      (AnalysisCapability.AllergenAssessment, "allergenAssessment"),
      (AnalysisCapability.InvoiceClassification, "invoiceClassification"),
      (AnalysisCapability.RecipeGeneration, "recipeGeneration"),
      (AnalysisCapability.MerchantClassification, "merchantClassification"),
      (AnalysisCapability.DescriptionGeneration, "descriptionGeneration"),
      (AnalysisFailureReason.Validation, "validation"),
      (AnalysisFailureReason.Dependency, "dependency"),
      (AnalysisFailureReason.DependencyValidation, "dependencyValidation"),
      (AnalysisFailureReason.Service, "service"),
      (AnalysisFailureReason.ContentFilter, "contentFilter"),
      (AnalysisFailureReason.InvalidStructuredOutput, "invalidStructuredOutput"),
      (AnalysisFailureReason.Taxonomy, "taxonomy"),
      (AnalysisFailureReason.LeaseLost, "leaseLost"),
      (AnalysisFailureReason.TargetPersistence, "targetPersistence"),
      (AnalysisFailureReason.UnsupportedTarget, "unsupportedTarget"),
      (AnalysisOutcome.Success, "success"),
      (AnalysisOutcome.Partial, "partial"),
      (AnalysisOutcome.Failure, "failure"),
      (AnalysisProfile.Custom, "custom"),
      (AnalysisProfile.Comprehensive, "comprehensive"),
      (AnalysisProfile.Fast, "fast"),
      (AnalysisProfile.Balanced, "balanced"),
      (AnalysisRunStatus.Queued, "queued"),
      (AnalysisRunStatus.Running, "running"),
      (AnalysisRunStatus.Completed, "completed"),
      (AnalysisRunStatus.Failed, "failed"),
      (AnalysisTargetType.Invoice, "invoice"),
      (AnalysisTargetType.Merchant, "merchant"),
      (AnalysisTargetType.Product, "product"),
      (AllergenAssessmentStatus.Detected, "detected"),
      (AllergenAssessmentStatus.NoSignals, "noSignals"),
      (AllergenAssessmentStatus.InsufficientData, "insufficientData"),
      (AllergenCode.CerealsContainingGluten, "cerealsContainingGluten"),
      (AllergenCode.Crustaceans, "crustaceans"),
      (AllergenCode.Eggs, "eggs"),
      (AllergenCode.Fish, "fish"),
      (AllergenCode.Peanuts, "peanuts"),
      (AllergenCode.Soybeans, "soybeans"),
      (AllergenCode.Milk, "milk"),
      (AllergenCode.Nuts, "nuts"),
      (AllergenCode.Celery, "celery"),
      (AllergenCode.Mustard, "mustard"),
      (AllergenCode.Sesame, "sesame"),
      (AllergenCode.SulphurDioxideAndSulphites, "sulphurDioxideAndSulphites"),
      (AllergenCode.Lupin, "lupin"),
      (AllergenCode.Molluscs, "molluscs"),
      (AllergenEvidenceLevel.Explicit, "explicit"),
      (AllergenEvidenceLevel.Inferred, "inferred"),
      (AllergenEvidenceLevel.Precautionary, "precautionary"),
      (ClassificationOrigin.Analysis, "Analysis"),
      (ClassificationOrigin.Manual, "Manual"),
      (ClassificationSystem.Gs1Gpc, "GS1_GPC"),
      (ClassificationSystem.EcoicopV2, "ECOICOP_V2"),
      (ClassificationSystem.Nace21, "NACE_2_1"),
      (RecipeDifficulty.Easy, "easy"),
      (RecipeDifficulty.Medium, "medium"),
      (RecipeDifficulty.Hard, "hard"),
      (ProductAllergenAssessmentStatus.SignalsFound, "signalsFound"),
      (ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence, "noSignalsInAvailableEvidence"),
      (ProductAllergenAssessmentStatus.InsufficientData, "insufficientData"),
      (ProductAllergenEvidenceTier.Declared, "declared"),
      (ProductAllergenEvidenceTier.Likely, "likely"),
      (ProductAllergenEvidenceTier.Possible, "possible"),
    ];

    foreach ((object value, string wireName) in cases)
    {
      // Act
      string json = JsonSerializer.Serialize(value, value.GetType(), ApiJsonOptions);

      // Assert
      Assert.AreEqual($"\"{wireName}\"", json, $"Unexpected wire name for {value.GetType().Name}.{value}.");
      Assert.ThrowsExactly<JsonException>(
        () => JsonSerializer.Deserialize("0", value.GetType(), ApiJsonOptions),
        $"Numeric JSON must be rejected for {value.GetType().Name}.{value}.");
    }
  }
}
