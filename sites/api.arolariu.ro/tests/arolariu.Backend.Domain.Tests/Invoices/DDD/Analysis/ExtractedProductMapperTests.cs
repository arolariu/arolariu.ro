namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the single shared projection from a transient <see cref="ExtractedProduct"/> onto the persisted
/// <see cref="Product"/> value object.
/// </summary>
/// <remarks>
/// <para>Two divergent copies of this projection previously existed - one in analysis orchestration and one in
/// analysis processing - and the copy on the persistence path silently dropped
/// <see cref="ExtractedProduct.Confidence"/>. These tests pin the single mapper both layers now share.</para>
/// </remarks>
[TestClass]
public sealed class ExtractedProductMapperTests
{
  /// <summary>
  /// Verifies every extracted field, including OCR confidence, reaches the persisted product.
  /// </summary>
  [TestMethod]
  public void ToDomainProduct_ValidExtractedProduct_ProjectsEveryFieldIncludingConfidence()
  {
    // Arrange
    var extracted = new ExtractedProduct("Whole Milk", 2.5m, "l", "MILK-42", 4.99m, 0.87);

    // Act
    Product product = ExtractedProductMapper.ToDomainProduct(extracted);

    // Assert
    Assert.AreEqual("Whole Milk", product.Name);
    Assert.AreEqual(2.5m, product.Quantity);
    Assert.AreEqual("l", product.QuantityUnit);
    Assert.AreEqual("MILK-42", product.ProductCode);
    Assert.AreEqual(4.99m, product.Price);
    Assert.AreEqual(0.87, product.Metadata.Confidence);
  }

  /// <summary>
  /// Verifies a freshly mapped product carries no analysis artifacts and no workflow flags, so a new line item
  /// never appears pre-enriched or pre-edited.
  /// </summary>
  [TestMethod]
  public void ToDomainProduct_ValidExtractedProduct_LeavesAnalysisArtifactsAndWorkflowFlagsClean()
  {
    // Arrange
    var extracted = new ExtractedProduct("Bread", 1m, "pcs", "BREAD-1", 7.5m, 0.42);

    // Act
    Product product = ExtractedProductMapper.ToDomainProduct(extracted);

    // Assert
    Assert.IsNull(product.Classification);
    Assert.IsNull(product.AllergenAssessment);
    Assert.IsFalse(product.Metadata.IsEdited);
    Assert.IsFalse(product.Metadata.IsComplete);
    Assert.IsFalse(product.Metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies a zero confidence is projected verbatim rather than being conflated with "not supplied".
  /// </summary>
  [TestMethod]
  public void ToDomainProduct_ZeroConfidence_ProjectsZeroVerbatim()
  {
    // Arrange
    var extracted = new ExtractedProduct("Unreadable line", 1m, string.Empty, string.Empty, 1m, 0d);

    // Act
    Product product = ExtractedProductMapper.ToDomainProduct(extracted);

    // Assert
    Assert.AreEqual(0d, product.Metadata.Confidence);
  }

  /// <summary>
  /// Verifies the mapper rejects a null extracted product rather than producing a hollow line item.
  /// </summary>
  [TestMethod]
  public void ToDomainProduct_NullExtractedProduct_ThrowsArgumentNullException() =>
    Assert.ThrowsExactly<ArgumentNullException>(() => ExtractedProductMapper.ToDomainProduct(null!));
}
