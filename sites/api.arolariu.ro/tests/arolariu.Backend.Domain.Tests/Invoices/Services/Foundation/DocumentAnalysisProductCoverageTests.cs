namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Globalization;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers receipt product materialization branches inside <see cref="AnalysisFoundationService"/>.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisProductCoverageTests
{
  /// <summary>
  /// Verifies blank or null product names are rejected before numeric normalization.
  /// </summary>
  /// <param name="name">The extracted product name.</param>
  [TestMethod]
  [DataRow(null)]
  [DataRow("   ")]
  public void TryCreateProduct_NullOrBlankName_ReturnsFalse(string? name)
  {
    bool created = InvokeTryCreateProduct(CreateProduct(name, "1", "2", "2"), out ExtractedProduct? product);

    Assert.IsFalse(created);
    Assert.IsNull(product);
  }

  /// <summary>
  /// Verifies negative quantities, prices, or totals are rejected.
  /// </summary>
  /// <param name="quantity">The extracted quantity text.</param>
  /// <param name="price">The extracted price text.</param>
  /// <param name="totalPrice">The extracted total price text.</param>
  [TestMethod]
  [DataRow("-1", "2", "2")]
  [DataRow("1", "-2", "2")]
  [DataRow("1", "2", "-2")]
  public void TryCreateProduct_NegativeNumericComponent_ReturnsFalse(
    string quantity,
    string price,
    string totalPrice)
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", quantity, price, totalPrice), out ExtractedProduct? product);

    Assert.IsFalse(created);
    Assert.IsNull(product);
  }

  /// <summary>
  /// Verifies null quantity values normalize to zero while retaining a valid product line.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_NullQuantity_CreatesProductWithZeroQuantity()
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", null, "2", null), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(0.0m, product.Quantity);
    Assert.AreEqual(2.0m, product.Price);
  }

  /// <summary>
  /// Verifies null price values normalize to zero while retaining a valid product line.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_NullPrice_CreatesProductWithZeroPrice()
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", "2", null, null), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(2.0m, product.Quantity);
    Assert.AreEqual(0.0m, product.Price);
  }

  /// <summary>
  /// Verifies zero quantity with a positive total and price derives a positive quantity.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_ZeroQuantityWithTotalAndPrice_DerivesQuantity()
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", "0", "2", "6"), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(3.0m, product.Quantity);
    Assert.AreEqual(2.0m, product.Price);
  }

  /// <summary>
  /// Verifies zero price with a positive total and quantity derives a positive price.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_ZeroPriceWithTotalAndQuantity_DerivesPrice()
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", "4", "0", "10"), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(4.0m, product.Quantity);
    Assert.AreEqual(2.5m, product.Price);
  }

  /// <summary>
  /// Verifies zero quantity and zero price take the non-positive derivation path and remain zero.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_ZeroQuantityAndZeroPrice_DoesNotDeriveComponent()
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", "0", "0", "10"), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(0.0m, product.Quantity);
    Assert.AreEqual(0.0m, product.Price);
  }

  private static bool InvokeTryCreateProduct(ReceiptProductDocument productDocument, out ExtractedProduct? product)
  {
    MethodInfo method = typeof(AnalysisFoundationService).GetMethod(
      "TryCreateProduct",
      BindingFlags.NonPublic | BindingFlags.Static)
      ?? throw new AssertFailedException("TryCreateProduct method was not found.");
    object?[] arguments = [productDocument, null, null];

    bool created = (bool)method.Invoke(null, arguments)!;
    product = (ExtractedProduct?)arguments[1];
    return created;
  }

  private static ReceiptProductDocument CreateProduct(
    string? name,
    string? quantity,
    string? price,
    string? totalPrice) =>
    new(
      new DocumentValue<string>(name, 0.98, -1),
      new DocumentValue<decimal?>(ParseNullableDecimal(quantity), 0.97, -1),
      new DocumentValue<string>("pcs", 0.96, -1),
      new DocumentValue<string>("SKU", 0.95, -1),
      new DocumentValue<decimal?>(ParseNullableDecimal(price), 0.94, -1),
      new DocumentValue<decimal?>(ParseNullableDecimal(totalPrice), 0.93, -1),
      0.91);

  private static decimal? ParseNullableDecimal(string? value) =>
    value is null ? null : decimal.Parse(value, CultureInfo.InvariantCulture);
}
