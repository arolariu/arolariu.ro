namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Xunit;

/// <summary>
/// Extended unit tests for the Product value object covering edge cases
/// and boundary conditions for comprehensive code coverage.
/// </summary>
public sealed class ProductExtendedTests
{
  #region Product Property Tests

  /// <summary>
  /// Validates Name property can be set.
  /// </summary>
  [Fact]
  public void Product_SetName_StoresValue()
  {
    // Arrange
    var product = new Product();
    var name = "Test Product Name";

    // Act
    product.Name = name;

    // Assert
    Assert.Equal(name, product.Name);
  }

  /// <summary>
  /// Validates Name with empty string.
  /// </summary>
  [Fact]
  public void Product_EmptyName_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Name = string.Empty };

    // Assert
    Assert.Equal(string.Empty, product.Name);
  }

  /// <summary>
  /// Validates product with long name.
  /// </summary>
  [Fact]
  public void Product_LongName_IsAllowed()
  {
    // Arrange
    var longName = new string('A', 1000);

    // Act
    var product = new Product { Name = longName };

    // Assert
    Assert.Equal(1000, product.Name.Length);
  }

  /// <summary>
  /// Validates product with special characters in name.
  /// </summary>
  [Fact]
  public void Product_SpecialCharactersInName_IsAllowed()
  {
    // Arrange
    var specialName = "Product @#$%^&*()_+-=[]{}|;':\",./<>?";

    // Act
    var product = new Product { Name = specialName };

    // Assert
    Assert.Equal(specialName, product.Name);
  }

  /// <summary>
  /// Validates product with unicode characters.
  /// </summary>
  [Fact]
  public void Product_UnicodeCharacters_IsAllowed()
  {
    // Arrange
    var unicodeName = "Produkt äöü ñ 日本語 中文";

    // Act
    var product = new Product { Name = unicodeName };

    // Assert
    Assert.Equal(unicodeName, product.Name);
  }

  /// <summary>
  /// Validates product with emoji.
  /// </summary>
  [Fact]
  public void Product_Emoji_IsAllowed()
  {
    // Arrange
    var emojiName = "Product 🍕🍔🌮";

    // Act
    var product = new Product { Name = emojiName };

    // Assert
    Assert.True(product.Name.Contains("🍕", StringComparison.Ordinal));
  }

  /// <summary>
  /// Validates product with whitespace.
  /// </summary>
  [Fact]
  public void Product_WhitespaceInName_IsAllowed()
  {
    // Arrange
    var spaceName = "   Product   with   spaces   ";

    // Act
    var product = new Product { Name = spaceName };

    // Assert
    Assert.Equal(spaceName, product.Name);
  }

  /// <summary>
  /// Validates product with newline characters.
  /// </summary>
  [Fact]
  public void Product_NewlineInName_IsAllowed()
  {
    // Arrange
    var multilineName = "Product\nwith\nnewlines";

    // Act
    var product = new Product { Name = multilineName };

    // Assert
    Assert.True(product.Name.Contains('\n', StringComparison.Ordinal));
  }

  /// <summary>
  /// Validates product with tab characters.
  /// </summary>
  [Fact]
  public void Product_TabInName_IsAllowed()
  {
    // Arrange
    var tabbedName = "Product\twith\ttabs";

    // Act
    var product = new Product { Name = tabbedName };

    // Assert
    Assert.True(product.Name.Contains('\t', StringComparison.Ordinal));
  }

  #endregion

  #region Product Numeric Property Tests

  /// <summary>
  /// Validates Quantity property.
  /// </summary>
  [Fact]
  public void Product_SetQuantity_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Quantity = 10;

    // Assert
    Assert.Equal(10, product.Quantity);
  }

  /// <summary>
  /// Validates Quantity with zero.
  /// </summary>
  [Fact]
  public void Product_ZeroQuantity_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Quantity = 0 };

    // Assert
    Assert.Equal(0, product.Quantity);
  }

  /// <summary>
  /// Validates Quantity with large number.
  /// </summary>
  [Fact]
  public void Product_LargeQuantity_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Quantity = decimal.MaxValue };

    // Assert
    Assert.Equal(decimal.MaxValue, product.Quantity);
  }

  /// <summary>
  /// Validates Quantity with decimal value.
  /// </summary>
  [Fact]
  public void Product_DecimalQuantity_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Quantity = 2.5m };

    // Assert
    Assert.Equal(2.5m, product.Quantity);
  }

  /// <summary>
  /// Validates TotalPrice is computed correctly.
  /// </summary>
  [Fact]
  public void Product_TotalPrice_IsComputedFromQuantityAndPrice()
  {
    // Arrange & Act
    var product = new Product { Quantity = 3, Price = 10M };

    // Assert
    Assert.Equal(30M, product.TotalPrice);
  }

  /// <summary>
  /// Validates TotalPrice with zero quantity.
  /// </summary>
  [Fact]
  public void Product_ZeroQuantity_TotalPriceIsZero()
  {
    // Arrange & Act
    var product = new Product { Quantity = 0, Price = 10M };

    // Assert
    Assert.Equal(0, product.TotalPrice);
  }

  /// <summary>
  /// Validates TotalPrice with zero price.
  /// </summary>
  [Fact]
  public void Product_ZeroPrice_TotalPriceIsZero()
  {
    // Arrange & Act
    var product = new Product { Quantity = 5, Price = 0 };

    // Assert
    Assert.Equal(0, product.TotalPrice);
  }

  /// <summary>
  /// Validates TotalPrice with decimal precision.
  /// </summary>
  [Fact]
  public void Product_HighPrecisionPrice_TotalPriceCalculatedCorrectly()
  {
    // Arrange & Act
    var product = new Product { Quantity = 2.5m, Price = 3.33m };

    // Assert
    Assert.Equal(8.325m, product.TotalPrice);
  }

  /// <summary>
  /// Validates Price property.
  /// </summary>
  [Fact]
  public void Product_SetPrice_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Price = 5.99M;

    // Assert
    Assert.Equal(5.99M, product.Price);
  }

  /// <summary>
  /// Validates Price with large value.
  /// </summary>
  [Fact]
  public void Product_LargePrice_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { Price = 999999.99M };

    // Assert
    Assert.Equal(999999.99M, product.Price);
  }

  #endregion

  #region Product Category Tests

  /// <summary>
  /// Validates Category can be set.
  /// </summary>
  [Fact]
  public void Product_SetCategory_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Category = ProductCategory.GROCERIES;

    // Assert
    Assert.Equal(ProductCategory.GROCERIES, product.Category);
  }

  /// <summary>
  /// Validates all ProductCategory enum values are valid.
  /// </summary>
  [Fact]
  public void Product_AllCategoryValues_AreValid()
  {
    // Arrange
    var categories = Enum.GetValues<ProductCategory>();

    // Act & Assert
    foreach (var category in categories)
    {
      var product = new Product { Category = category };
      Assert.Equal(category, product.Category);
    }
  }

  /// <summary>
  /// Validates default ProductCategory.
  /// </summary>
  [Fact]
  public void Product_DefaultCategory_IsOther()
  {
    // Arrange & Act
    var product = new Product();

    // Assert
    Assert.Equal(ProductCategory.OTHER, product.Category);
  }

  /// <summary>
  /// Validates ProductCategory.NOT_DEFINED exists.
  /// </summary>
  [Fact]
  public void ProductCategory_NotDefined_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.NOT_DEFINED));
  }

  /// <summary>
  /// Validates ProductCategory.BEVERAGES exists.
  /// </summary>
  [Fact]
  public void ProductCategory_Beverages_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.BEVERAGES));
  }

  /// <summary>
  /// Validates ProductCategory.CLEANING_SUPPLIES exists.
  /// </summary>
  [Fact]
  public void ProductCategory_CleaningSupplies_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.CLEANING_SUPPLIES));
  }

  /// <summary>
  /// Validates ProductCategory.OTHER exists.
  /// </summary>
  [Fact]
  public void ProductCategory_Other_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.OTHER));
  }

  /// <summary>
  /// Validates ProductCategory enum has expected values.
  /// </summary>
  [Fact]
  public void ProductCategory_HasExpectedValueCount()
  {
    // Arrange
    var values = Enum.GetValues<ProductCategory>();

    // Assert - Should have multiple categories (14 total)
    Assert.True(values.Length >= 14);
  }

  /// <summary>
  /// Validates ProductCategory.DAIRY exists.
  /// </summary>
  [Fact]
  public void ProductCategory_Dairy_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.DAIRY));
  }

  /// <summary>
  /// Validates ProductCategory.MEAT exists.
  /// </summary>
  [Fact]
  public void ProductCategory_Meat_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.MEAT));
  }

  /// <summary>
  /// Validates ProductCategory.FRUITS exists.
  /// </summary>
  [Fact]
  public void ProductCategory_Fruits_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.FRUITS));
  }

  /// <summary>
  /// Validates ProductCategory.VEGETABLES exists.
  /// </summary>
  [Fact]
  public void ProductCategory_Vegetables_Exists()
  {
    Assert.True(Enum.IsDefined<ProductCategory>(ProductCategory.VEGETABLES));
  }

  #endregion

  #region Product Default Value Tests

  /// <summary>
  /// Validates new product has default Name.
  /// </summary>
  [Fact]
  public void Product_NewProduct_HasDefaultName()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - Name should be initialized to empty string
    Assert.Equal(string.Empty, product.Name);
  }

  /// <summary>
  /// Validates new product has default Quantity.
  /// </summary>
  [Fact]
  public void Product_NewProduct_HasDefaultQuantity()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - Quantity should be 0
    Assert.Equal(0, product.Quantity);
  }

  /// <summary>
  /// Validates new product has default Price.
  /// </summary>
  [Fact]
  public void Product_NewProduct_HasDefaultPrice()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - Price should be 0
    Assert.Equal(0, product.Price);
  }

  /// <summary>
  /// Validates new product has default QuantityUnit.
  /// </summary>
  [Fact]
  public void Product_NewProduct_HasDefaultQuantityUnit()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - QuantityUnit should be empty string
    Assert.Equal(string.Empty, product.QuantityUnit);
  }

  /// <summary>
  /// Validates new product has default ProductCode.
  /// </summary>
  [Fact]
  public void Product_NewProduct_HasDefaultProductCode()
  {
    // Arrange & Act
    var product = new Product();

    // Assert - ProductCode should be empty string
    Assert.Equal(string.Empty, product.ProductCode);
  }

  /// <summary>
  /// Validates multiple products can be created.
  /// </summary>
  [Fact]
  public void Product_CreateMultiple_AllAreIndependent()
  {
    // Arrange & Act
    var products = Enumerable.Range(0, 100)
        .Select(i => new Product { Name = $"Product {i}" })
        .ToList();

    // Assert
    Assert.Equal(100, products.Count);
    Assert.All(products, p => Assert.NotNull(p.Name));
  }

  #endregion

  #region Product Measurement Tests

  /// <summary>
  /// Validates QuantityUnit property.
  /// </summary>
  [Fact]
  public void Product_SetQuantityUnit_StoresValue()
  {
    // Arrange
    var product = new Product();
    var unit = "kg";

    // Act
    product.QuantityUnit = unit;

    // Assert
    Assert.Equal(unit, product.QuantityUnit);
  }

  /// <summary>
  /// Validates various quantity units.
  /// </summary>
  [Theory]
  [InlineData("kg")]
  [InlineData("g")]
  [InlineData("L")]
  [InlineData("ml")]
  [InlineData("pcs")]
  [InlineData("units")]
  public void Product_VariousQuantityUnits_AreAllowed(string unit)
  {
    // Arrange & Act
    var product = new Product { QuantityUnit = unit };

    // Assert
    Assert.Equal(unit, product.QuantityUnit);
  }

  /// <summary>
  /// Validates ProductCode property.
  /// </summary>
  [Fact]
  public void Product_SetProductCode_StoresValue()
  {
    // Arrange
    var product = new Product();
    var code = "SKU-12345";

    // Act
    product.ProductCode = code;

    // Assert
    Assert.Equal(code, product.ProductCode);
  }

  /// <summary>
  /// Validates ProductCode with barcode format.
  /// </summary>
  [Theory]
  [InlineData("1234567890123")]
  [InlineData("ABC-123-XYZ")]
  [InlineData("")]
  public void Product_VariousProductCodes_AreAllowed(string code)
  {
    // Arrange & Act
    var product = new Product { ProductCode = code };

    // Assert
    Assert.Equal(code, product.ProductCode);
  }

  #endregion

  #region Product DetectedAllergens Tests

  /// <summary>
  /// Validates DetectedAllergens can be set.
  /// </summary>
  [Fact]
  public void Product_SetDetectedAllergens_StoresValue()
  {
    // Arrange
    var product = new Product();
    var allergens = new[]
    {
            new Allergen { Name = "Gluten" },
            new Allergen { Name = "Dairy" },
            new Allergen { Name = "Nuts" }
        };

    // Act
    product.DetectedAllergens = allergens;

    // Assert
    Assert.Equal(3, product.DetectedAllergens.Count());
    Assert.Contains(product.DetectedAllergens, a => a.Name == "Gluten");
  }

  /// <summary>
  /// Validates empty allergens collection.
  /// </summary>
  [Fact]
  public void Product_EmptyAllergens_IsAllowed()
  {
    // Arrange & Act
    var product = new Product { DetectedAllergens = Array.Empty<Allergen>() };

    // Assert
    Assert.Empty(product.DetectedAllergens);
  }

  /// <summary>
  /// Validates large allergens collection.
  /// </summary>
  [Fact]
  public void Product_LargeAllergensCollection_IsAllowed()
  {
    // Arrange
    var allergens = Enumerable.Range(0, 100)
        .Select(i => new Allergen { Name = $"Allergen{i}" })
        .ToArray();

    // Act
    var product = new Product { DetectedAllergens = allergens };

    // Assert
    Assert.Equal(100, product.DetectedAllergens.Count());
  }

  /// <summary>
  /// Validates default allergens is empty collection.
  /// </summary>
  [Fact]
  public void Product_DefaultAllergens_IsEmptyCollection()
  {
    // Arrange & Act
    var product = new Product();

    // Assert
    Assert.NotNull(product.DetectedAllergens);
    Assert.Empty(product.DetectedAllergens);
  }

  #endregion

  #region Product Equality Tests

  /// <summary>
  /// Validates two products with same properties.
  /// </summary>
  [Fact]
  public void Product_SameProperties_AreDistinctInstances()
  {
    // Arrange
    var product1 = new Product { Name = "Product A" };
    var product2 = new Product { Name = "Product A" };

    // Assert - They are different instances
    Assert.NotSame(product1, product2);
  }

  /// <summary>
  /// Validates product reference equality.
  /// </summary>
  [Fact]
  public void Product_SameReference_AreEqual()
  {
    // Arrange
    var product1 = new Product { Name = "Product A" };
    var product2 = product1;

    // Assert
    Assert.Same(product1, product2);
  }

  #endregion

  #region Product Initialization Tests

  /// <summary>
  /// Validates product can be initialized with object initializer.
  /// </summary>
  [Fact]
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
    Assert.Equal("Test", product.Name);
    Assert.Equal("Test Generic", product.Name);
    Assert.Equal(5, product.Quantity);
    Assert.Equal(2.00M, product.Price);
    Assert.Equal(10.00M, product.TotalPrice);
  }

  /// <summary>
  /// Validates product properties can be modified after creation.
  /// </summary>
  [Fact]
  public void Product_ModifyAfterCreation_Works()
  {
    // Arrange
    var product = new Product { Name = "Original" };

    // Act
    product.Name = "Modified";

    // Assert
    Assert.Equal("Modified", product.Name);
  }

  /// <summary>
  /// Validates full product initialization with all properties.
  /// </summary>
  [Fact]
  public void Product_FullInitialization_Works()
  {
    // Arrange & Act
    var product = new Product
    {
      Name = "MONSTER ENERGY 500ML",
      Category = ProductCategory.BEVERAGES,
      Quantity = 2,
      QuantityUnit = "pcs",
      ProductCode = "5449000131805",
      Price = 4.99M,
      DetectedAllergens = new[] { new Allergen { Name = "Caffeine" } }
    };

    // Assert
    Assert.Equal("MONSTER ENERGY 500ML", product.Name);
    Assert.Equal("Energy Drink", product.Name);
    Assert.Equal(ProductCategory.BEVERAGES, product.Category);
    Assert.Equal(2, product.Quantity);
    Assert.Equal("pcs", product.QuantityUnit);
    Assert.Equal("5449000131805", product.ProductCode);
    Assert.Equal(4.99M, product.Price);
    Assert.Equal(9.98M, product.TotalPrice);
    Assert.Single(product.DetectedAllergens);
  }

  #endregion

  #region Allergen Tests

  /// <summary>
  /// Validates Allergen can be created with defaults.
  /// </summary>
  [Fact]
  public void Allergen_DefaultCreation_HasEmptyName()
  {
    // Arrange & Act
    var allergen = new Allergen();

    // Assert
    Assert.Equal(string.Empty, allergen.Name);
  }

  /// <summary>
  /// Validates Allergen Name property.
  /// </summary>
  [Fact]
  public void Allergen_SetName_StoresValue()
  {
    // Arrange
    var allergen = new Allergen();

    // Act
    allergen.Name = "Peanuts";

    // Assert
    Assert.Equal("Peanuts", allergen.Name);
  }

  /// <summary>
  /// Validates Allergen Description property.
  /// </summary>
  [Fact]
  public void Allergen_SetDescription_StoresValue()
  {
    // Arrange
    var allergen = new Allergen();

    // Act
    allergen.Description = "Contains tree nuts";

    // Assert
    Assert.Equal("Contains tree nuts", allergen.Description);
  }

  /// <summary>
  /// Validates Allergen LearnMoreAddress property.
  /// </summary>
  [Fact]
  public void Allergen_SetLearnMoreAddress_StoresValue()
  {
    // Arrange
    var allergen = new Allergen();
    var uri = new Uri("https://example.com/allergens");

    // Act
    allergen.LearnMoreAddress = uri;

    // Assert
    Assert.Equal(uri, allergen.LearnMoreAddress);
  }

  /// <summary>
  /// Validates Allergen default LearnMoreAddress.
  /// </summary>
  [Fact]
  public void Allergen_DefaultLearnMoreAddress_IsArolariu()
  {
    // Arrange & Act
    var allergen = new Allergen();

    // Assert
    Assert.Equal("https://arolariu.ro/", allergen.LearnMoreAddress.ToString());
  }

  /// <summary>
  /// Validates Allergen record equality.
  /// </summary>
  [Fact]
  public void Allergen_SameValues_AreEqual()
  {
    // Arrange
    var allergen1 = new Allergen { Name = "Gluten", Description = "Contains gluten" };
    var allergen2 = new Allergen { Name = "Gluten", Description = "Contains gluten" };

    // Assert - Records with same values should be equal
    Assert.Equal(allergen1, allergen2);
  }

  /// <summary>
  /// Validates Allergen record inequality.
  /// </summary>
  [Fact]
  public void Allergen_DifferentValues_AreNotEqual()
  {
    // Arrange
    var allergen1 = new Allergen { Name = "Gluten" };
    var allergen2 = new Allergen { Name = "Dairy" };

    // Assert
    Assert.NotEqual(allergen1, allergen2);
  }

  /// <summary>
  /// Validates common allergen names.
  /// </summary>
  [Theory]
  [InlineData("Gluten")]
  [InlineData("Dairy")]
  [InlineData("Eggs")]
  [InlineData("Peanuts")]
  [InlineData("Tree Nuts")]
  [InlineData("Fish")]
  [InlineData("Shellfish")]
  [InlineData("Soy")]
  [InlineData("Wheat")]
  [InlineData("Sesame")]
  public void Allergen_CommonAllergenNames_AreAccepted(string name)
  {
    // Arrange & Act
    var allergen = new Allergen { Name = name };

    // Assert
    Assert.Equal(name, allergen.Name);
  }

  #endregion
}
