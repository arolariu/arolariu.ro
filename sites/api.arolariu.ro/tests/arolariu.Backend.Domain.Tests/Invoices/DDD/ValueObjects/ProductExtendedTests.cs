namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Extended unit tests for the Product value object covering edge cases
/// and boundary conditions for comprehensive code coverage.
/// </summary>
[TestClass]
public sealed class ProductExtendedTests
{
  #region Product Property Tests

  /// <summary>
  /// Validates Name property can be set.
  /// </summary>
  [TestMethod]
  public void Product_SetName_StoresValue()
  {
    // Arrange
    var product = new Product();
    var name = "Test Product Name";

    // Act
    product.Name = name;

    // Assert
    Assert.AreEqual(name, product.Name);
  }

  /// <summary>
  /// Validates Name with empty string.
  /// </summary>
  [TestMethod]
  public void Product_EmptyName_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Name = string.Empty };

    // Assert
    Assert.AreEqual(string.Empty, product.Name);
  }

  /// <summary>
  /// Validates product with long name.
  /// </summary>
  [TestMethod]
  public void Product_LongName_IsAllowed()
  {
    // Arrange
    var longName = new string('A', 1000);

    // Act
    var product = new Product { Name = longName };

    // Assert
    Assert.AreEqual(1000, product.Name.Length);
  }

  /// <summary>
  /// Validates product with special characters in name.
  /// </summary>
  [TestMethod]
  public void Product_SpecialCharactersInName_IsAllowed()
  {
    // Arrange
    var specialName = "Product @#$%^&*()_+-=[]{}|;':\",./<>?";

    // Act
    var product = new Product { Name = specialName };

    // Assert
    Assert.AreEqual(specialName, product.Name);
  }

  /// <summary>
  /// Validates product with unicode characters.
  /// </summary>
  [TestMethod]
  public void Product_UnicodeCharacters_IsAllowed()
  {
    // Arrange
    var unicodeName = "Produkt äöü ñ 日本語 中文";

    // Act
    var product = new Product { Name = unicodeName };

    // Assert
    Assert.AreEqual(unicodeName, product.Name);
  }

  /// <summary>
  /// Validates product with emoji.
  /// </summary>
  [TestMethod]
  public void Product_Emoji_IsAllowed()
  {
    // Arrange
    var emojiName = "Product 🍕🍔🌮";

    // Act
    var product = new Product { Name = emojiName };

    // Assert
    Assert.IsTrue(product.Name.Contains("🍕", StringComparison.Ordinal));
  }

  /// <summary>
  /// Validates product with whitespace.
  /// </summary>
  [TestMethod]
  public void Product_WhitespaceInName_IsAllowed()
  {
    // Arrange
    var spaceName = "   Product   with   spaces   ";

    // Act
    var product = new Product { Name = spaceName };

    // Assert
    Assert.AreEqual(spaceName, product.Name);
  }

  /// <summary>
  /// Validates product with newline characters.
  /// </summary>
  [TestMethod]
  public void Product_NewlineInName_IsAllowed()
  {
    // Arrange
    var multilineName = "Product\nwith\nnewlines";

    // Act
    var product = new Product { Name = multilineName };

    // Assert
    Assert.IsTrue(product.Name.Contains('\n', StringComparison.Ordinal));
  }

  /// <summary>
  /// Validates product with tab characters.
  /// </summary>
  [TestMethod]
  public void Product_TabInName_IsAllowed()
  {
    // Arrange
    var tabbedName = "Product\twith\ttabs";

    // Act
    var product = new Product { Name = tabbedName };

    // Assert
    Assert.IsTrue(product.Name.Contains('\t', StringComparison.Ordinal));
  }

  #endregion

  #region Product Numeric Property Tests

  /// <summary>
  /// Validates Quantity property.
  /// </summary>
  [TestMethod]
  public void Product_SetQuantity_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Quantity = 10;

    // Assert
    Assert.AreEqual(10, product.Quantity);
  }

  /// <summary>
  /// Validates Quantity with zero.
  /// </summary>
  [TestMethod]
  public void Product_ZeroQuantity_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Quantity = 0 };

    // Assert
    Assert.AreEqual(0, product.Quantity);
  }

  /// <summary>
  /// Validates Quantity with large number.
  /// </summary>
  [TestMethod]
  public void Product_LargeQuantity_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Quantity = decimal.MaxValue };

    // Assert
    Assert.AreEqual(decimal.MaxValue, product.Quantity);
  }

  /// <summary>
  /// Validates Quantity with decimal value.
  /// </summary>
  [TestMethod]
  public void Product_DecimalQuantity_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Quantity = 2.5m };

    // Assert
    Assert.AreEqual(2.5m, product.Quantity);
  }

  /// <summary>
  /// Validates TotalPrice is computed correctly.
  /// </summary>
  [TestMethod]
  public void Product_TotalPrice_IsComputedFromQuantityAndPrice()
  {
    // Arrange & Act
    var product = new Product { Quantity = 3, Price = 10M };

    // Assert
    Assert.AreEqual(30M, product.TotalPrice);
  }

  /// <summary>
  /// Validates TotalPrice with zero quantity.
  /// </summary>
  [TestMethod]
  public void Product_ZeroQuantity_TotalPriceIsZero()
  {
    // Arrange & Act
    var product = new Product { Quantity = 0, Price = 10M };

    // Assert
    Assert.AreEqual(0, product.TotalPrice);
  }

  /// <summary>
  /// Validates TotalPrice with zero price.
  /// </summary>
  [TestMethod]
  public void Product_ZeroPrice_TotalPriceIsZero()
  {
    // Arrange & Act
    var product = new Product { Quantity = 5, Price = 0 };

    // Assert
    Assert.AreEqual(0, product.TotalPrice);
  }

  /// <summary>
  /// Validates TotalPrice with decimal precision.
  /// </summary>
  [TestMethod]
  public void Product_HighPrecisionPrice_TotalPriceCalculatedCorrectly()
  {
    // Arrange & Act
    var product = new Product { Quantity = 2.5m, Price = 3.33m };

    // Assert
    Assert.AreEqual(8.325m, product.TotalPrice);
  }

  /// <summary>
  /// Validates Price property.
  /// </summary>
  [TestMethod]
  public void Product_SetPrice_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Price = 5.99M;

    // Assert
    Assert.AreEqual(5.99M, product.Price);
  }

  /// <summary>
  /// Validates Price with large value.
  /// </summary>
  [TestMethod]
  public void Product_LargePrice_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Price = 999999.99M };

    // Assert
    Assert.AreEqual(999999.99M, product.Price);
  }

  #endregion

  #region Product Default Value Tests

  /// <summary>
  /// Validates new product has default Name.
  /// </summary>
  [TestMethod]
  public void Product_NewProduct_HasDefaultName()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - Name should be initialized to empty string
    Assert.AreEqual(string.Empty, product.Name);
  }

  /// <summary>
  /// Validates new product has default Quantity.
  /// </summary>
  [TestMethod]
  public void Product_NewProduct_HasDefaultQuantity()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - Quantity should be 0
    Assert.AreEqual(0, product.Quantity);
  }

  /// <summary>
  /// Validates new product has default Price.
  /// </summary>
  [TestMethod]
  public void Product_NewProduct_HasDefaultPrice()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - Price should be 0
    Assert.AreEqual(0, product.Price);
  }

  /// <summary>
  /// Validates new product has default QuantityUnit.
  /// </summary>
  [TestMethod]
  public void Product_NewProduct_HasDefaultQuantityUnit()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - QuantityUnit should be empty string
    Assert.AreEqual(string.Empty, product.QuantityUnit);
  }

  /// <summary>
  /// Validates new product has default ProductCode.
  /// </summary>
  [TestMethod]
  public void Product_NewProduct_HasDefaultProductCode()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - ProductCode should be empty string
    Assert.AreEqual(string.Empty, product.ProductCode);
  }

  /// <summary>
  /// Validates multiple products can be created.
  /// </summary>
  [TestMethod]
  public void Product_CreateMultiple_AllAreIndependent()
  {
    // Arrange & Act
    var products = Enumerable.Range(0, 100)
        .Select(i => new Product { Name = $"Product {i}" })
        .ToList();

    // Assert
    Assert.AreEqual(100, products.Count);
    foreach (var p in products)
    {
      Assert.IsNotNull(p.Name);
    }
  }

  #endregion

  #region Product Measurement Tests

  /// <summary>
  /// Validates QuantityUnit property.
  /// </summary>
  [TestMethod]
  public void Product_SetQuantityUnit_StoresValue()
  {
    // Arrange
    var product = new Product();
    var unit = "kg";

    // Act
    product.QuantityUnit = unit;

    // Assert
    Assert.AreEqual(unit, product.QuantityUnit);
  }

  /// <summary>
  /// Validates various quantity units.
  /// </summary>
  [TestMethod]
  [DataRow("kg")]
  [DataRow("g")]
  [DataRow("L")]
  [DataRow("ml")]
  [DataRow("pcs")]
  [DataRow("units")]
  public void Product_VariousQuantityUnits_AreAllowed(string unit)
  {
    // Arrange & Act
    var product = new Product { QuantityUnit = unit };

    // Assert
    Assert.AreEqual(unit, product.QuantityUnit);
  }

  /// <summary>
  /// Validates ProductCode property.
  /// </summary>
  [TestMethod]
  public void Product_SetProductCode_StoresValue()
  {
    // Arrange
    var product = new Product();
    var code = "SKU-12345";

    // Act
    product.ProductCode = code;

    // Assert
    Assert.AreEqual(code, product.ProductCode);
  }

  /// <summary>
  /// Validates ProductCode with barcode format.
  /// </summary>
  [TestMethod]
  [DataRow("1234567890123")]
  [DataRow("ABC-123-XYZ")]
  [DataRow("")]
  public void Product_VariousProductCodes_AreAllowed(string code)
  {
    // Arrange & Act
    var product = new Product { ProductCode = code };

    // Assert
    Assert.AreEqual(code, product.ProductCode);
  }

  #endregion

  #region Product Equality Tests

  /// <summary>
  /// Validates two products with same properties.
  /// </summary>
  [TestMethod]
  public void Product_SameProperties_AreDistinctInstances()
  {
    // Arrange
    var product1 = new Product { Name = "Product A" };
    var product2 = new Product { Name = "Product A" };

    // Assert - They are different instances
    Assert.AreNotSame(product1, product2);
  }

  /// <summary>
  /// Validates product reference equality.
  /// </summary>
  [TestMethod]
  public void Product_SameReference_AreEqual()
  {
    // Arrange
    var product1 = new Product { Name = "Product A" };
    var product2 = product1;

    // Assert
    Assert.AreSame(product1, product2);
  }

  #endregion

  #region Product Initialization Tests

  /// <summary>
  /// Validates product can be initialized with object initializer.
  /// </summary>
  [TestMethod]
  public void Product_ObjectInitializer_Works()
  {
    // Arrange & Act
    var product = new Product
    {
      Name = "Test",
      Quantity = 5,
      Price = 2.00M
    };

    // Assert
    Assert.AreEqual("Test", product.Name);
    Assert.AreEqual(5, product.Quantity);
    Assert.AreEqual(2.00M, product.Price);
    Assert.AreEqual(10.00M, product.TotalPrice);
  }

  /// <summary>
  /// Validates product properties can be modified after creation.
  /// </summary>
  [TestMethod]
  public void Product_ModifyAfterCreation_Works()
  {
    // Arrange
    var product = new Product { Name = "Original" };

    // Act
    product.Name = "Modified";

    // Assert
    Assert.AreEqual("Modified", product.Name);
  }

  /// <summary>
  /// Validates full product initialization with all properties.
  /// </summary>
  [TestMethod]
  public void Product_FullInitialization_Works()
  {
    // Arrange & Act
    var product = new Product
    {
      Name = "MONSTER ENERGY 500ML",
      Classification = ClassificationTestData.Gpc("10000123", "Energy Drinks"),
      Quantity = 2,
      QuantityUnit = "pcs",
      ProductCode = "5449000131805",
      Price = 4.99M,
      AllergenAssessment = AllergenAssessment.NoSignals()
    };

    // Assert
    Assert.AreEqual("MONSTER ENERGY 500ML", product.Name);
    Assert.AreEqual("10000123", product.Classification!.Code);
    Assert.AreEqual(2, product.Quantity);
    Assert.AreEqual("pcs", product.QuantityUnit);
    Assert.AreEqual("5449000131805", product.ProductCode);
    Assert.AreEqual(4.99M, product.Price);
    Assert.AreEqual(9.98M, product.TotalPrice);
    Assert.IsEmpty(product.AllergenAssessment!.Signals);
  }

  #endregion

}
