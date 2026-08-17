namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Analysis.Contracts;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers product-result mapper correlation success, empty, and missing-classification branches.
/// </summary>
[TestClass]
public sealed class ProductResultMapperCoverageTests
{
  /// <summary>
  /// Verifies mapping an empty product batch returns an empty result without requiring classifications.
  /// </summary>
  [TestMethod]
  public void Map_EmptyProducts_ReturnsEmptyResult()
  {
    var classifications = new ProductClassificationResult(
      new Dictionary<string, StandardClassification>(StringComparer.Ordinal));

    IReadOnlyList<ClassifiedProductAnalysisResult> results = ProductResultMapper.Map([], classifications);

    Assert.AreEqual(0, results.Count);
  }

  /// <summary>
  /// Verifies mapping preserves input order while pairing each product with its matching classification.
  /// </summary>
  [TestMethod]
  public void Map_ClassificationsForEveryToken_ReturnsOrderedPairs()
  {
    var first = new Product { Name = "Milk", Metadata = new ProductMetadata() };
    var second = new Product { Name = "Bread", Metadata = new ProductMetadata() };
    ProductAnalysisInput[] inputs =
    [
      new("first", first),
      new("second", second),
    ];
    StandardClassification classification = ClassificationTestData.Gpc("10000025", "Milk");
    var classifications = new ProductClassificationResult(
      new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
      {
        ["second"] = classification,
        ["first"] = classification,
      });

    IReadOnlyList<ClassifiedProductAnalysisResult> results = ProductResultMapper.Map(inputs, classifications);

    Assert.AreSame(first, results[0].Product);
    Assert.AreSame(second, results[1].Product);
    Assert.AreSame(classification, results[0].Classification);
    Assert.AreSame(classification, results[1].Classification);
  }

  /// <summary>
  /// Verifies mapping fails when the classification result omits a requested correlation token.
  /// </summary>
  [TestMethod]
  public void Map_MissingCorrelationToken_ThrowsArgumentException()
  {
    ProductAnalysisInput[] inputs =
    [
      new("missing", new Product { Name = "Milk", Metadata = new ProductMetadata() }),
    ];
    var classifications = new ProductClassificationResult(
      new Dictionary<string, StandardClassification>(StringComparer.Ordinal));

    Assert.ThrowsExactly<ArgumentException>(() => ProductResultMapper.Map(inputs, classifications));
  }
}

