namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Results;

using System;
using System.Collections;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests coverage-sensitive analysis result records and patch change detection.
/// </summary>
[TestClass]
public sealed class AnalysisResultCoverageTests
{
  private static T? NullOf<T>() where T : class => null;
  /// <summary>
  /// Verifies that each invoice patch section independently marks the patch as changed.
  /// </summary>
  /// <param name="changedSection">The single section populated for this row.</param>
  [TestMethod]
  [DataRow(nameof(InvoiceAnalysisPatch.ExtractionUpdate))]
  [DataRow(nameof(InvoiceAnalysisPatch.MerchantReferenceUpdate))]
  [DataRow(nameof(InvoiceAnalysisPatch.SummaryUpdate))]
  [DataRow(nameof(InvoiceAnalysisPatch.ProductClassificationUpdate))]
  [DataRow(nameof(InvoiceAnalysisPatch.AllergenAssessmentUpdate))]
  [DataRow(nameof(InvoiceAnalysisPatch.InvoiceClassificationUpdate))]
  [DataRow(nameof(InvoiceAnalysisPatch.RecipeGenerationUpdate))]
  public void HasChanges_SingleInvoicePatchSectionIsPresent_ReturnsTrue(string changedSection)
  {
    InvoiceAnalysisPatch patch = CreateInvoicePatch(changedSection);

    Assert.IsTrue(patch.HasChanges);
  }

  /// <summary>
  /// Verifies that an empty invoice patch reports no changes.
  /// </summary>
  [TestMethod]
  public void HasChanges_AllInvoicePatchSectionsAreNull_ReturnsFalse()
  {
    var patch = new InvoiceAnalysisPatch(null, null, null, null, null, null, null);

    Assert.IsFalse(patch.HasChanges);
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for invoice patches.
  /// </summary>
  [TestMethod]
  public void InvoiceAnalysisPatch_EquivalentRecords_ExercisesRecordMembers()
  {
    InvoiceAnalysisPatch patch = CreateInvoicePatch(nameof(InvoiceAnalysisPatch.SummaryUpdate));
    InvoiceAnalysisPatch equal = CreateInvoicePatch(nameof(InvoiceAnalysisPatch.SummaryUpdate));
    InvoiceAnalysisPatch different = CreateInvoicePatch(nameof(InvoiceAnalysisPatch.MerchantReferenceUpdate));
    InvoiceAnalysisPatch copy = patch with { };

    Assert.IsTrue(patch.Equals(equal));
    Assert.AreEqual(patch.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(patch.Equals(different));
    Assert.IsFalse(patch.Equals(NullOf<object>()));
    Assert.AreEqual(patch, copy);
    StringAssert.Contains(patch.ToString(), nameof(InvoiceAnalysisPatch.SummaryUpdate), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies that a merchant patch without populated sections reports no changes.
  /// </summary>
  [TestMethod]
  public void HasChanges_AllMerchantPatchSectionsAreNull_ReturnsFalse()
  {
    var patch = new MerchantAnalysisPatch(null, null);

    Assert.IsFalse(patch.HasChanges);
  }

  /// <summary>
  /// Verifies that each merchant patch section independently marks the patch as changed.
  /// </summary>
  /// <param name="changedSection">The single section populated for this row.</param>
  [TestMethod]
  [DataRow(nameof(MerchantAnalysisPatch.ClassificationUpdate))]
  [DataRow(nameof(MerchantAnalysisPatch.DescriptionUpdate))]
  public void HasChanges_SingleMerchantPatchSectionIsPresent_ReturnsTrue(string changedSection)
  {
    MerchantAnalysisPatch patch = changedSection switch
    {
      nameof(MerchantAnalysisPatch.ClassificationUpdate) => new MerchantAnalysisPatch(CreateMerchantClassificationResult(), null),
      nameof(MerchantAnalysisPatch.DescriptionUpdate) => new MerchantAnalysisPatch(null, new MerchantDescriptionResult("Local grocery merchant.")),
      _ => throw new ArgumentOutOfRangeException(nameof(changedSection), changedSection, "Unknown merchant patch section."),
    };

    Assert.IsTrue(patch.HasChanges);
  }

  /// <summary>
  /// Verifies confidence property getters and guard validation for merchant candidates.
  /// </summary>
  [TestMethod]
  public void MerchantCandidate_ValidAndInvalidConfidence_ExercisesConfidenceMembers()
  {
    var candidate = new MerchantCandidate(" Shop ", " Address ", " 555 ", 0, 0.5, 1);

    Assert.AreEqual(0, candidate.NameConfidence);
    Assert.AreEqual(0.5, candidate.AddressConfidence);
    Assert.AreEqual(1, candidate.PhoneNumberConfidence);
    Assert.AreEqual("Shop", candidate.Name);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new MerchantCandidate("Shop", "Address", "555", -0.01, 0.5, 1));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for merchant candidates.
  /// </summary>
  [TestMethod]
  public void MerchantCandidate_EquivalentRecords_ExercisesRecordMembers()
  {
    var candidate = new MerchantCandidate("Shop", "Address", "555", 0.8, 0.7, 0.6);
    var equal = new MerchantCandidate("Shop", "Address", "555", 0.8, 0.7, 0.6);
    var different = new MerchantCandidate("Other", "Address", "555", 0.8, 0.7, 0.6);
    MerchantCandidate copy = candidate with { };

    Assert.IsTrue(candidate.Equals(equal));
    Assert.AreEqual(candidate.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(candidate.Equals(different));
    Assert.IsFalse(candidate.Equals(NullOf<object>()));
    Assert.AreEqual(candidate, copy);
    StringAssert.Contains(candidate.ToString(), nameof(MerchantCandidate.NameConfidence), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies extracted product constructor guards and valid boundary values.
  /// </summary>
  [TestMethod]
  public void ExtractedProduct_QuantityAndPriceBoundaries_ExercisesConstructorBranches()
  {
    var product = new ExtractedProduct(" Milk ", 0, " l ", " 123 ", 0, 1);

    Assert.AreEqual("Milk", product.Name);
    Assert.AreEqual(0, product.Quantity);
    Assert.AreEqual("l", product.QuantityUnit);
    Assert.AreEqual("123", product.ProductCode);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ExtractedProduct("Milk", -0.01m, "l", "123", 0, 0.5));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ExtractedProduct("Milk", 1, "l", "123", -0.01m, 0.5));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for extracted products.
  /// </summary>
  [TestMethod]
  public void ExtractedProduct_EquivalentRecords_ExercisesRecordMembers()
  {
    var product = new ExtractedProduct("Milk", 1, "l", "123", 9.99m, 0.9);
    var equal = new ExtractedProduct("Milk", 1, "l", "123", 9.99m, 0.9);
    var different = new ExtractedProduct("Bread", 1, "pcs", "456", 4.99m, 0.8);
    ExtractedProduct copy = product with { };

    Assert.IsTrue(product.Equals(equal));
    Assert.AreEqual(product.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(product.Equals(different));
    Assert.IsFalse(product.Equals(NullOf<object>()));
    Assert.AreEqual(product, copy);
    StringAssert.Contains(product.ToString(), nameof(ExtractedProduct.ProductCode), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies receipt extraction snapshot guards and clone behavior.
  /// </summary>
  [TestMethod]
  public void ReceiptExtractionResult_ProductSnapshotContainsNull_ThrowsArgumentException()
  {
    ExtractedProduct?[] products = [null];

    Assert.ThrowsExactly<ArgumentException>(() => new ReceiptExtractionResult(
      null,
      products!,
      CreatePaymentInformation(),
      "receipt",
      "RO",
      [],
      []));
  }

  /// <summary>
  /// Verifies receipt extraction snapshots and clones mutable collection inputs.
  /// </summary>
  [TestMethod]
  public void ReceiptExtractionResult_ValidInput_SnapshotsAndClonesInputs()
  {
    var paymentInformation = CreatePaymentInformation();
    PaymentDetail payment = new() { Method = "Card", Amount = 12.5m };
    TaxDetail tax = new() { Amount = 1.5m, Rate = 19m, NetAmount = 11m, Description = "VAT" };

    var result = new ReceiptExtractionResult(
      CreateMerchantCandidate(),
      [CreateExtractedProduct()],
      paymentInformation,
      " receipt ",
      " RO ",
      [tax],
      [payment]);

    paymentInformation.TotalCostAmount = 99m;
    payment.Amount = 99m;
    tax.Amount = 99m;

    Assert.AreEqual(12.5m, result.PaymentInformation.TotalCostAmount);
    Assert.AreEqual(12.5m, result.Payments[0].Amount);
    Assert.AreEqual(1.5m, result.TaxDetails[0].Amount);
    Assert.AreEqual("receipt", result.ReceiptType);
    Assert.AreEqual("RO", result.CountryRegion);
  }

  /// <summary>
  /// Verifies record equality, string formatting, null comparison, and cloning for receipt extraction results.
  /// </summary>
  [TestMethod]
  public void ReceiptExtractionResult_RecordMembers_ExercisesGeneratedMembers()
  {
    ReceiptExtractionResult result = CreateReceiptExtractionResult();
    ReceiptExtractionResult copy = result with { };
    ReceiptExtractionResult different = new(null, [], CreatePaymentInformation(), "invoice", "RO", [], []);

    Assert.IsTrue(result.Equals(copy));
    Assert.IsFalse(result.Equals(different));
    Assert.IsFalse(result.Equals(NullOf<object>()));
    StringAssert.Contains(result.ToString(), nameof(ReceiptExtractionResult.Products), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies product classification result constructor guards.
  /// </summary>
  [TestMethod]
  public void ProductClassificationResult_InvalidDictionaries_ThrowExpectedExceptions()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductClassificationResult(null!));
    Assert.ThrowsExactly<ArgumentException>(() => new ProductClassificationResult(new Dictionary<string, StandardClassification>
    {
      [" "] = CreateStandardClassification(),
    }));
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductClassificationResult(new Dictionary<string, StandardClassification>
    {
      ["product-1"] = null!,
    }));
  }

  /// <summary>
  /// Verifies record equality, string formatting, null comparison, and cloning for product classification results.
  /// </summary>
  [TestMethod]
  public void ProductClassificationResult_RecordMembers_ExercisesGeneratedMembers()
  {
    ProductClassificationResult result = CreateProductClassificationResult();
    ProductClassificationResult copy = result with { };
    ProductClassificationResult different = new(new Dictionary<string, StandardClassification>
    {
      ["product-2"] = CreateStandardClassification(),
    });

    Assert.IsTrue(result.Equals(copy));
    Assert.IsFalse(result.Equals(different));
    Assert.IsFalse(result.Equals(NullOf<object>()));
    StringAssert.Contains(result.ToString(), nameof(ProductClassificationResult.Classifications), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies invoice and merchant classification result null guards.
  /// </summary>
  [TestMethod]
  public void ClassificationResult_NullClassification_ThrowsArgumentNullException()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => new InvoiceClassificationResult(null!));
    Assert.ThrowsExactly<ArgumentNullException>(() => new MerchantClassificationResult(null!));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for invoice classification results.
  /// </summary>
  [TestMethod]
  public void InvoiceClassificationResult_EquivalentRecords_ExercisesRecordMembers()
  {
    InvoiceClassificationResult result = CreateInvoiceClassificationResult();
    InvoiceClassificationResult equal = CreateInvoiceClassificationResult();
    InvoiceClassificationResult different = new(CreateStandardClassification("02", "Beverages"));
    InvoiceClassificationResult copy = result with { };

    Assert.IsTrue(result.Equals(equal));
    Assert.AreEqual(result.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(result.Equals(different));
    Assert.IsFalse(result.Equals(NullOf<object>()));
    Assert.AreEqual(result, copy);
    StringAssert.Contains(result.ToString(), nameof(InvoiceClassificationResult.Classification), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for merchant classification results.
  /// </summary>
  [TestMethod]
  public void MerchantClassificationResult_EquivalentRecords_ExercisesRecordMembers()
  {
    MerchantClassificationResult result = CreateMerchantClassificationResult();
    MerchantClassificationResult equal = CreateMerchantClassificationResult();
    MerchantClassificationResult different = new(CreateStandardClassification("02", "Beverages"));
    MerchantClassificationResult copy = result with { };

    Assert.IsTrue(result.Equals(equal));
    Assert.AreEqual(result.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(result.Equals(different));
    Assert.IsFalse(result.Equals(NullOf<object>()));
    Assert.AreEqual(result, copy);
    StringAssert.Contains(result.ToString(), nameof(MerchantClassificationResult.Classification), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies recipe generation result constructor guards and upper boundary.
  /// </summary>
  [TestMethod]
  public void RecipeGenerationResult_RecipeCountBoundaries_ExercisesConstructorBranches()
  {
    var valid = new RecipeGenerationResult([CreateRecipeSuggestion(), CreateRecipeSuggestion(), CreateRecipeSuggestion()]);

    Assert.AreEqual(3, valid.Recipes.Count);
    Assert.ThrowsExactly<ArgumentNullException>(() => new RecipeGenerationResult(null!));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new RecipeGenerationResult(
      [CreateRecipeSuggestion(), CreateRecipeSuggestion(), CreateRecipeSuggestion(), CreateRecipeSuggestion()]));
  }

  /// <summary>
  /// Verifies record equality, string formatting, null comparison, and cloning for recipe generation results.
  /// </summary>
  [TestMethod]
  public void RecipeGenerationResult_RecordMembers_ExercisesGeneratedMembers()
  {
    var recipe = CreateRecipeSuggestion();
    var result = new RecipeGenerationResult([recipe]);
    RecipeGenerationResult copy = result with { };
    RecipeGenerationResult different = new([]);

    Assert.IsTrue(result.Equals(copy));
    Assert.IsFalse(result.Equals(different));
    Assert.IsFalse(result.Equals(NullOf<object>()));
    StringAssert.Contains(result.ToString(), nameof(RecipeGenerationResult.Recipes), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies product allergen assessment result factory, dictionary guards, and duplicate-key validation.
  /// </summary>
  [TestMethod]
  public void ProductAllergenAssessmentResult_DictionaryBoundaries_ExercisesConstructorBranches()
  {
    ProductAllergenAssessment insufficient = ProductAllergenAssessment.InsufficientData();
    var result = new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>
    {
      ["product-1"] = insufficient,
    });

    Assert.AreEqual(ProductAllergenAssessmentStatus.InsufficientData, result.Assessments["product-1"].Status);
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductAllergenAssessmentResult(null!));
    Assert.ThrowsExactly<ArgumentException>(() => new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>
    {
      [" "] = insufficient,
    }));
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductAllergenAssessmentResult(new Dictionary<string, ProductAllergenAssessment>
    {
      ["product-1"] = null!,
    }));
    Assert.ThrowsExactly<ArgumentException>(() => new ProductAllergenAssessmentResult(new DuplicateAssessmentDictionary(insufficient)));
  }

  /// <summary>
  /// Verifies product allergen assessment constructor status and signal consistency guards.
  /// </summary>
  [TestMethod]
  public void ProductAllergenAssessment_StatusAndSignals_ExercisesConstructorBranches()
  {
    ProductAllergenSignal signal = CreateProductAllergenSignal();

    Assert.AreEqual(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence, ProductAllergenAssessment.NoSignalsInAvailableEvidence().Status);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ProductAllergenAssessment((ProductAllergenAssessmentStatus)999, []));
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductAllergenAssessment(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence, null!));
    Assert.ThrowsExactly<ArgumentException>(() => ProductAllergenAssessment.SignalsFound([]));
    Assert.ThrowsExactly<ArgumentException>(() => new ProductAllergenAssessment(ProductAllergenAssessmentStatus.InsufficientData, [signal]));
    Assert.ThrowsExactly<ArgumentException>(() => ProductAllergenAssessment.SignalsFound([signal, CreateProductAllergenSignal()]));
  }

  /// <summary>
  /// Verifies product allergen signal constructor guards and valid boundaries.
  /// </summary>
  [TestMethod]
  public void ProductAllergenSignal_ConstructorBoundaries_ExercisesConstructorBranches()
  {
    ProductAllergenSignal signal = CreateProductAllergenSignal(0);
    ProductAllergenSignal maximum = CreateProductAllergenSignal(1);

    Assert.AreEqual(0, signal.Confidence);
    Assert.AreEqual(1, maximum.Confidence);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ProductAllergenSignal((AllergenCode)999, ProductAllergenEvidenceTier.Declared, 0.5, [CreateAllergenEvidence()]));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ProductAllergenSignal(AllergenCode.Milk, (ProductAllergenEvidenceTier)999, 0.5, [CreateAllergenEvidence()]));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new ProductAllergenSignal(AllergenCode.Milk, ProductAllergenEvidenceTier.Declared, -0.01, [CreateAllergenEvidence()]));
    Assert.ThrowsExactly<ArgumentNullException>(() => new ProductAllergenSignal(AllergenCode.Milk, ProductAllergenEvidenceTier.Declared, 0.5, null!));
    Assert.ThrowsExactly<ArgumentException>(() => new ProductAllergenSignal(AllergenCode.Milk, ProductAllergenEvidenceTier.Declared, 0.5, []));
  }

  /// <summary>
  /// Verifies record equality, string formatting, null comparison, and cloning for product allergen assessment results.
  /// </summary>
  [TestMethod]
  public void ProductAllergenAssessmentResult_RecordMembers_ExercisesGeneratedMembers()
  {
    ProductAllergenAssessmentResult result = CreateProductAllergenAssessmentResult();
    ProductAllergenAssessmentResult copy = result with { };
    ProductAllergenAssessmentResult different = new(new Dictionary<string, ProductAllergenAssessment>
    {
      ["product-2"] = ProductAllergenAssessment.InsufficientData(),
    });

    Assert.IsTrue(result.Equals(copy));
    Assert.IsFalse(result.Equals(different));
    Assert.IsFalse(result.Equals(NullOf<object>()));
    StringAssert.Contains(result.ToString(), nameof(ProductAllergenAssessmentResult.Assessments), StringComparison.Ordinal);
  }

  private static InvoiceAnalysisPatch CreateInvoicePatch(string changedSection) =>
    changedSection switch
    {
      nameof(InvoiceAnalysisPatch.ExtractionUpdate) => new InvoiceAnalysisPatch(CreateReceiptExtractionResult(), null, null, null, null, null, null),
      nameof(InvoiceAnalysisPatch.MerchantReferenceUpdate) => new InvoiceAnalysisPatch(null, Guid.Parse("11111111-1111-1111-1111-111111111111"), null, null, null, null, null),
      nameof(InvoiceAnalysisPatch.SummaryUpdate) => new InvoiceAnalysisPatch(null, null, new InvoiceSummaryResult("Groceries", "Weekly groceries"), null, null, null, null),
      nameof(InvoiceAnalysisPatch.ProductClassificationUpdate) => new InvoiceAnalysisPatch(null, null, null, CreateProductClassificationResult(), null, null, null),
      nameof(InvoiceAnalysisPatch.AllergenAssessmentUpdate) => new InvoiceAnalysisPatch(null, null, null, null, CreateProductAllergenAssessmentResult(), null, null),
      nameof(InvoiceAnalysisPatch.InvoiceClassificationUpdate) => new InvoiceAnalysisPatch(null, null, null, null, null, CreateInvoiceClassificationResult(), null),
      nameof(InvoiceAnalysisPatch.RecipeGenerationUpdate) => new InvoiceAnalysisPatch(null, null, null, null, null, null, new RecipeGenerationResult([])),
      _ => throw new ArgumentOutOfRangeException(nameof(changedSection), changedSection, "Unknown invoice patch section."),
    };

  private static ReceiptExtractionResult CreateReceiptExtractionResult() =>
    new(CreateMerchantCandidate(), [CreateExtractedProduct()], CreatePaymentInformation(), "receipt", "RO", [], []);

  private static MerchantCandidate CreateMerchantCandidate() =>
    new("Shop", "Address", "555", 0.8, 0.7, 0.6);

  private static ExtractedProduct CreateExtractedProduct() =>
    new("Milk", 1, "l", "123", 12.5m, 0.9);

  private static PaymentInformation CreatePaymentInformation() =>
    new()
    {
      PaymentType = PaymentType.CARD,
      TotalCostAmount = 12.5m,
      TotalTaxAmount = 1.5m,
      SubtotalAmount = 11m,
    };

  private static ProductClassificationResult CreateProductClassificationResult() =>
    new(new Dictionary<string, StandardClassification>
    {
      ["product-1"] = CreateStandardClassification(),
    });

  private static ProductAllergenAssessmentResult CreateProductAllergenAssessmentResult() =>
    new(new Dictionary<string, ProductAllergenAssessment>
    {
      ["product-1"] = ProductAllergenAssessment.InsufficientData(),
    });

  private static ProductAllergenSignal CreateProductAllergenSignal(double confidence = 0.9) =>
    new(AllergenCode.Milk, ProductAllergenEvidenceTier.Declared, confidence, [CreateAllergenEvidence()]);

  private static AllergenEvidence CreateAllergenEvidence() =>
    new("ingredients", "milk");

  private static InvoiceClassificationResult CreateInvoiceClassificationResult() =>
    new(CreateStandardClassification());

  private static MerchantClassificationResult CreateMerchantClassificationResult() =>
    new(CreateStandardClassification());

  private static StandardClassification CreateStandardClassification(string code = "01", string label = "Food") =>
    new(
      ClassificationSystem.EcoicopV2,
      "2",
      code,
      label,
      [new ClassificationNode("division", code, label)],
      ClassificationOrigin.Analysis,
      0.9,
      [new ClassificationEvidence("product.name", label)]);

  private static RecipeSuggestion CreateRecipeSuggestion() =>
    new(
      "Toast",
      "Quick toast",
      1,
      1,
      2,
      3,
      RecipeDifficulty.Easy,
      [new RecipeIngredient("Bread", "1 slice", null)],
      [],
      [],
      [new RecipeStep(1, "Toast bread.", null)],
      [],
      Guid.Parse("22222222-2222-2222-2222-222222222222"));

  /// <summary>
  /// Provides duplicate correlation-token entries for dictionary snapshot guard coverage.
  /// </summary>
  private sealed class DuplicateAssessmentDictionary : IReadOnlyDictionary<string, ProductAllergenAssessment>
  {
    private readonly ProductAllergenAssessment assessment;

    public DuplicateAssessmentDictionary(ProductAllergenAssessment assessment) =>
      this.assessment = assessment;

    public IEnumerable<string> Keys => ["product-1", "product-1"];

    public IEnumerable<ProductAllergenAssessment> Values => [assessment, assessment];

    public int Count => 2;

    public ProductAllergenAssessment this[string key] => assessment;

    public bool ContainsKey(string key) =>
      string.Equals(key, "product-1", StringComparison.Ordinal);

    public IEnumerator<KeyValuePair<string, ProductAllergenAssessment>> GetEnumerator()
    {
      yield return new KeyValuePair<string, ProductAllergenAssessment>("product-1", assessment);
      yield return new KeyValuePair<string, ProductAllergenAssessment>("product-1", assessment);
    }

    public bool TryGetValue(string key, out ProductAllergenAssessment value)
    {
      value = assessment;
      return ContainsKey(key);
    }

    IEnumerator IEnumerable.GetEnumerator() =>
      GetEnumerator();
  }
}
