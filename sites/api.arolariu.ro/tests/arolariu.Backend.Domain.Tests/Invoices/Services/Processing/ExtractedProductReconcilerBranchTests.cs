namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

/// <summary>
/// Verifies extracted product reconciliation branch behavior for product-code and attribute fallback matching.
/// </summary>
[TestClass]
public sealed class ExtractedProductReconcilerBranchTests
{
  /// <summary>
  /// Verifies a null previous collection yields clean products with no carried-over analysis state.
  /// </summary>
  [TestMethod]
  public void Reconcile_NullPreviousItems_ReturnsCleanExtractedProducts()
  {
    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      previousItems: null,
      [AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1", confidence: 0.81)]);

    Assert.AreEqual(1, reconciled.Count);
    Assert.AreEqual("Milk", reconciled[0].Name);
    Assert.IsNull(reconciled[0].Classification);
    Assert.IsNull(reconciled[0].AllergenAssessment);
    Assert.AreEqual(0.81, reconciled[0].Metadata.Confidence);
  }

  /// <summary>
  /// Verifies blank product codes fall back to normalized name, quantity, and price matching.
  /// </summary>
  [TestMethod]
  public void Reconcile_BlankProductCodeAndWhitespaceName_CarriesOverByNormalizedAttributes()
  {
    AllergenAssessment previousAssessment = AllergenAssessment.NoSignals(Guid.CreateVersion7());
    Product previous = CreatePreviousProduct("  Whole   Milk  ", "   ", isEdited: true, isComplete: false);
    previous.AllergenAssessment = previousAssessment;

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      [previous],
      [AnalysisProcessingTestData.ExtractedProduct("whole milk", string.Empty, quantity: 1m, price: 4.5m, confidence: 0.91)]);

    Assert.AreEqual(1, reconciled.Count);
    Assert.AreEqual(previousAssessment, reconciled[0].AllergenAssessment);
    Assert.IsTrue(reconciled[0].Metadata.IsEdited);
    Assert.AreEqual(0.91, reconciled[0].Metadata.Confidence);
  }

  /// <summary>
  /// Verifies duplicate products that share the fallback attribute key are reconciled in first-in-first-out order.
  /// </summary>
  [TestMethod]
  public void Reconcile_DuplicateAttributeMatches_CarriesOverInQueueOrder()
  {
    Product firstPrevious = CreatePreviousProduct("Milk", string.Empty, isEdited: true, isComplete: false);
    Product secondPrevious = CreatePreviousProduct("Milk", string.Empty, isEdited: false, isComplete: true);

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      [firstPrevious, secondPrevious],
      [
        AnalysisProcessingTestData.ExtractedProduct("Milk", string.Empty, quantity: 1m, price: 4.5m, confidence: 0.7),
        AnalysisProcessingTestData.ExtractedProduct("Milk", string.Empty, quantity: 1m, price: 4.5m, confidence: 0.8),
      ]);

    Assert.AreEqual(2, reconciled.Count);
    Assert.IsTrue(reconciled[0].Metadata.IsEdited);
    Assert.IsFalse(reconciled[0].Metadata.IsComplete);
    Assert.IsFalse(reconciled[1].Metadata.IsEdited);
    Assert.IsTrue(reconciled[1].Metadata.IsComplete);
  }

  /// <summary>
  /// Verifies product-code matching consumes the shared entry so the later attribute lookup cannot reuse it.
  /// </summary>
  [TestMethod]
  public void Reconcile_ProductCodeConsumesEntry_AttributeFallbackDoesNotReuseConsumedEntry()
  {
    Product previous = CreatePreviousProduct("Milk", "SKU-1", isEdited: true, isComplete: true);

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      [previous],
      [
        AnalysisProcessingTestData.ExtractedProduct("Milk", " sku-1 ", quantity: 1m, price: 4.5m, confidence: 0.7),
        AnalysisProcessingTestData.ExtractedProduct("Milk", string.Empty, quantity: 1m, price: 4.5m, confidence: 0.8),
      ]);

    Assert.AreEqual(2, reconciled.Count);
    Assert.IsTrue(reconciled[0].Metadata.IsEdited);
    Assert.IsTrue(reconciled[0].Metadata.IsComplete);
    Assert.IsFalse(reconciled[1].Metadata.IsEdited);
    Assert.IsFalse(reconciled[1].Metadata.IsComplete);
  }

  /// <summary>
  /// Verifies an unmatched product takes the missing-key TryDequeue path and starts with clean metadata.
  /// </summary>
  [TestMethod]
  public void Reconcile_UnmatchedProductCode_ReturnsCleanProduct()
  {
    Product previous = CreatePreviousProduct("Bread", "BREAD-1", isEdited: true, isComplete: true);

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      [previous],
      [AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1", quantity: 1m, price: 4.5m, confidence: 0.9)]);

    Assert.AreEqual(1, reconciled.Count);
    Assert.IsFalse(reconciled[0].Metadata.IsEdited);
    Assert.IsFalse(reconciled[0].Metadata.IsComplete);
    Assert.IsNull(reconciled[0].AllergenAssessment);
  }

  /// <summary>
  /// Verifies a null entry in the previously persisted collection is skipped instead of throwing, while a valid
  /// sibling entry in the same collection is still carried over normally.
  /// </summary>
  [TestMethod]
  public void Reconcile_PreviousItemsContainsNullEntry_SkipsNullAndCarriesOverRemainingEntries()
  {
    Product previous = CreatePreviousProduct("Milk", "MILK-1", isEdited: true, isComplete: true);

    List<Product> reconciled = ExtractedProductReconciler.Reconcile(
      [null!, previous],
      [AnalysisProcessingTestData.ExtractedProduct("Milk", "MILK-1", quantity: 1m, price: 4.5m, confidence: 0.9)]);

    Assert.AreEqual(1, reconciled.Count);
    Assert.IsTrue(reconciled[0].Metadata.IsEdited);
    Assert.IsTrue(reconciled[0].Metadata.IsComplete);
  }

  private static Product CreatePreviousProduct(string name, string productCode, bool isEdited, bool isComplete) =>
    new()
    {
      Name = name,
      Quantity = 1m,
      QuantityUnit = "pcs",
      ProductCode = productCode,
      Price = 4.5m,
      Metadata = new ProductMetadata
      {
        IsEdited = isEdited,
        IsComplete = isComplete,
        IsSoftDeleted = isEdited && isComplete,
        Confidence = 0.1,
      },
    };
}
