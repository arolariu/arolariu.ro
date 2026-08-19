namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System.Globalization;
using System.Reflection;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Covers remaining document-analysis product derivation and helper branch combinations.
/// </summary>
[TestClass]
public sealed class DocumentAnalysisProductBranchCoverageTests
{
  /// <summary>
  /// Verifies zero-price derivation branches for each false clause and the successful derivation path.
  /// </summary>
  /// <param name="quantity">The extracted quantity value.</param>
  /// <param name="price">The extracted price value.</param>
  /// <param name="totalPrice">The extracted total-price value.</param>
  /// <param name="expectedPrice">The expected mapped price.</param>
  [TestMethod]
  [DataRow("4.0", "0.0", "10.0", "2.5")]
  [DataRow("4.0", "1.0", "10.0", "1.0")]
  [DataRow("0.0", "0.0", "10.0", "0.0")]
  [DataRow("4.0", "0.0", "0.0", "0.0")]
  public void TryCreateProduct_ZeroPriceDerivationClauseMatrix_ReturnsExpectedPrice(
    string quantity,
    string price,
    string totalPrice,
    string expectedPrice)
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", quantity, price, totalPrice), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(ParseDecimal(expectedPrice), product.Price);
  }

  /// <summary>
  /// Verifies a positive total and enormous divisor can underflow the derived component to a non-positive candidate.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_DerivedPriceUnderflowsToZero_KeepsOriginalZeroPrice()
  {
    bool created = InvokeTryCreateProduct(
      CreateProduct("Milk", "10000000000000000000000000000", "0.0", "0.01"),
      out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(0.0m, product.Price);
  }

  /// <summary>
  /// Verifies a derived component is rejected when multiplying it back does not reconstruct the rounded total.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_DerivedPriceDoesNotReconstructTotal_KeepsOriginalZeroPrice()
  {
    bool created = InvokeTryCreateProduct(
      CreateProduct("Milk", "6.0", "0.0", "79228162514264337593543950335"),
      out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(0.0m, product.Price);
  }

  /// <summary>
  /// Verifies the post-derivation negative guard false path keeps a valid product line.
  /// </summary>
  [TestMethod]
  public void TryCreateProduct_NonNegativeQuantityAndPrice_ReturnsProduct()
  {
    bool created = InvokeTryCreateProduct(CreateProduct("Milk", "1.0", "2.0", "2.0"), out ExtractedProduct? product);

    Assert.IsTrue(created);
    Assert.IsNotNull(product);
    Assert.AreEqual(1.0m, product.Quantity);
    Assert.AreEqual(2.0m, product.Price);
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
    string name,
    string quantity,
    string price,
    string totalPrice) =>
    new(
      new DocumentValue<string>(name, 0.98, -1),
      new DocumentValue<decimal?>(ParseDecimal(quantity), 0.97, -1),
      new DocumentValue<string>("pcs", 0.96, -1),
      new DocumentValue<string>("SKU", 0.95, -1),
      new DocumentValue<decimal?>(ParseDecimal(price), 0.94, -1),
      new DocumentValue<decimal?>(ParseDecimal(totalPrice), 0.93, -1),
      0.91);

  private static decimal ParseDecimal(string value) =>
    decimal.Parse(value, CultureInfo.InvariantCulture);
}
