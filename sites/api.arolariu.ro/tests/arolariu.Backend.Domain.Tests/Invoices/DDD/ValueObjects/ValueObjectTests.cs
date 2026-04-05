namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Xunit;

/// <summary>
/// Comprehensive unit tests for all Value Object classes in the invoicing domain.
/// Tests validate property initialization, equality semantics, default values, and record behavior.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class ValueObjectTests
{
  #region Currency Tests

  /// <summary>
  /// Verifies Currency struct can be created with all parameters.
  /// </summary>
  [Fact]
  public void Currency_ParameterizedConstructor_SetsAllProperties()
  {
    // Arrange & Act
    var currency = new Currency("US Dollar", "USD", "$");

    // Assert
    Assert.Equal("US Dollar", currency.Name);
    Assert.Equal("USD", currency.Code);
    Assert.Equal("$", currency.Symbol);
  }

  /// <summary>
  /// Verifies Currency default constructor creates instance with default values.
  /// </summary>
  [Fact]
  public void Currency_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var currency = new Currency();

    // Assert
    Assert.Null(currency.Name);
    Assert.Null(currency.Code);
    Assert.Null(currency.Symbol);
  }

  /// <summary>
  /// Verifies Currency equality based on value.
  /// </summary>
  [Fact]
  public void Currency_SameValues_AreEqual()
  {
    // Arrange
    var currency1 = new Currency("Euro", "EUR", "€");
    var currency2 = new Currency("Euro", "EUR", "€");

    // Assert
    Assert.Equal(currency1, currency2);
    Assert.True(currency1 == currency2);
  }

  /// <summary>
  /// Verifies Currency inequality for different values.
  /// </summary>
  [Fact]
  public void Currency_DifferentValues_AreNotEqual()
  {
    // Arrange
    var currency1 = new Currency("US Dollar", "USD", "$");
    var currency2 = new Currency("Euro", "EUR", "€");

    // Assert
    Assert.NotEqual(currency1, currency2);
    Assert.True(currency1 != currency2);
  }

  /// <summary>
  /// Verifies Currency has consistent hash code for same values.
  /// </summary>
  [Fact]
  public void Currency_SameValues_HaveSameHashCode()
  {
    // Arrange
    var currency1 = new Currency("British Pound", "GBP", "£");
    var currency2 = new Currency("British Pound", "GBP", "£");

    // Assert
    Assert.Equal(currency1.GetHashCode(), currency2.GetHashCode());
  }

  /// <summary>
  /// Verifies Currency has Serializable attribute.
  /// </summary>
  [Fact]
  public void Currency_HasSerializableAttribute()
  {
    // Assert
    Assert.True(Attribute.IsDefined(typeof(Currency), typeof(SerializableAttribute)));
  }

  #endregion

  #region ContactInformation Tests

  /// <summary>
  /// Verifies ContactInformation creates instance with default empty values.
  /// </summary>
  [Fact]
  public void ContactInformation_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var contact = new ContactInformation();

    // Assert
    Assert.Equal(string.Empty, contact.FullName);
    Assert.Equal(string.Empty, contact.Address);
    Assert.Equal(string.Empty, contact.PhoneNumber);
    Assert.Equal(string.Empty, contact.EmailAddress);
    Assert.Equal(string.Empty, contact.Website);
  }

  /// <summary>
  /// Verifies ContactInformation properties can be set.
  /// </summary>
  [Fact]
  public void ContactInformation_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var contact = new ContactInformation
    {
      FullName = "John Doe",
      Address = "123 Main St",
      PhoneNumber = "+1234567890",
      EmailAddress = "john@example.com",
      Website = "https://example.com"
    };

    // Assert
    Assert.Equal("John Doe", contact.FullName);
    Assert.Equal("123 Main St", contact.Address);
    Assert.Equal("+1234567890", contact.PhoneNumber);
    Assert.Equal("john@example.com", contact.EmailAddress);
    Assert.Equal("https://example.com", contact.Website);
  }

  /// <summary>
  /// Verifies ContactInformation equality based on value.
  /// </summary>
  [Fact]
  public void ContactInformation_SameValues_AreEqual()
  {
    // Arrange
    var contact1 = new ContactInformation { FullName = "Test", EmailAddress = "test@test.com" };
    var contact2 = new ContactInformation { FullName = "Test", EmailAddress = "test@test.com" };

    // Assert
    Assert.Equal(contact1, contact2);
  }

  /// <summary>
  /// Verifies ContactInformation has Serializable attribute.
  /// </summary>
  [Fact]
  public void ContactInformation_HasSerializableAttribute()
  {
    // Assert
    Assert.True(Attribute.IsDefined(typeof(ContactInformation), typeof(SerializableAttribute)));
  }

  #endregion

  #region PaymentInformation Tests

  /// <summary>
  /// Verifies PaymentInformation creates instance with default values.
  /// </summary>
  [Fact]
  public void PaymentInformation_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var payment = new PaymentInformation();

    // Assert
    Assert.Equal(PaymentType.UNKNOWN, payment.PaymentType);
    Assert.Equal(0.0m, payment.TotalCostAmount);
    Assert.Equal(0.0m, payment.TotalTaxAmount);
    Assert.NotEqual(default, payment.TransactionDate);
    Assert.Equal("Romanian Leu", payment.Currency.Name);
    Assert.Equal("RON", payment.Currency.Code);
    Assert.Equal("lei", payment.Currency.Symbol);
  }

  /// <summary>
  /// Verifies PaymentInformation properties can be set.
  /// </summary>
  [Fact]
  public void PaymentInformation_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var transactionDate = DateTimeOffset.UtcNow;
    var payment = new PaymentInformation
    {
      TransactionDate = transactionDate,
      PaymentType = PaymentType.CARD,
      Currency = new Currency("US Dollar", "USD", "$"),
      TotalCostAmount = 100.50m,
      TotalTaxAmount = 19.00m
    };

    // Assert
    Assert.Equal(transactionDate, payment.TransactionDate);
    Assert.Equal(PaymentType.CARD, payment.PaymentType);
    Assert.Equal("USD", payment.Currency.Code);
    Assert.Equal(100.50m, payment.TotalCostAmount);
    Assert.Equal(19.00m, payment.TotalTaxAmount);
  }

  /// <summary>
  /// Verifies PaymentInformation equality based on value.
  /// </summary>
  [Fact]
  public void PaymentInformation_SameValues_AreEqual()
  {
    // Arrange
    var date = DateTimeOffset.UtcNow;
    var payment1 = new PaymentInformation { TransactionDate = date, TotalCostAmount = 50m };
    var payment2 = new PaymentInformation { TransactionDate = date, TotalCostAmount = 50m };

    // Assert
    Assert.Equal(payment1, payment2);
  }

  /// <summary>
  /// Verifies PaymentInformation has Serializable attribute.
  /// </summary>
  [Fact]
  public void PaymentInformation_HasSerializableAttribute()
  {
    // Assert
    Assert.True(Attribute.IsDefined(typeof(PaymentInformation), typeof(SerializableAttribute)));
  }

  #endregion

  #region PaymentType Enum Tests

  /// <summary>
  /// Verifies PaymentType enum has expected values.
  /// </summary>
  [Theory]
  [InlineData(PaymentType.UNKNOWN, 0)]
  [InlineData(PaymentType.CASH, 100)]
  [InlineData(PaymentType.CARD, 200)]
  [InlineData(PaymentType.TRANSFER, 300)]
  [InlineData(PaymentType.MOBILEPAYMENT, 400)]
  [InlineData(PaymentType.VOUCHER, 500)]
  [InlineData(PaymentType.Other, 9999)]
  public void PaymentType_EnumValues_HaveCorrectUnderlyingValues(PaymentType paymentType, int expectedValue)
  {
    // Assert
    Assert.Equal(expectedValue, (int)paymentType);
  }

  /// <summary>
  /// Verifies all PaymentType enum values can be parsed.
  /// </summary>
  [Theory]
  [InlineData("UNKNOWN")]
  [InlineData("CASH")]
  [InlineData("CARD")]
  [InlineData("TRANSFER")]
  [InlineData("MOBILEPAYMENT")]
  [InlineData("VOUCHER")]
  [InlineData("Other")]
  public void PaymentType_ParseFromString_ReturnsCorrectValue(string paymentTypeName)
  {
    // Act
    var parsed = Enum.Parse<PaymentType>(paymentTypeName);

    // Assert
    Assert.True(Enum.IsDefined<PaymentType>(parsed));
  }

  #endregion

  #region Allergen Tests

  /// <summary>
  /// Verifies Allergen creates instance with default values.
  /// </summary>
  [Fact]
  public void Allergen_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var allergen = new Allergen();

    // Assert
    Assert.Equal(string.Empty, allergen.Name);
    Assert.Equal(string.Empty, allergen.Description);
    Assert.NotNull(allergen.LearnMoreAddress);
    Assert.Equal("https://arolariu.ro/", allergen.LearnMoreAddress.ToString());
  }

  /// <summary>
  /// Verifies Allergen properties can be set.
  /// </summary>
  [Fact]
  public void Allergen_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var allergen = new Allergen
    {
      Name = "Peanuts",
      Description = "Common tree nut allergen",
      LearnMoreAddress = new Uri("https://example.com/allergens/peanuts")
    };

    // Assert
    Assert.Equal("Peanuts", allergen.Name);
    Assert.Equal("Common tree nut allergen", allergen.Description);
    Assert.Equal("https://example.com/allergens/peanuts", allergen.LearnMoreAddress.ToString());
  }

  /// <summary>
  /// Verifies Allergen equality based on value.
  /// </summary>
  [Fact]
  public void Allergen_SameValues_AreEqual()
  {
    // Arrange
    var allergen1 = new Allergen { Name = "Gluten", Description = "Wheat protein" };
    var allergen2 = new Allergen { Name = "Gluten", Description = "Wheat protein" };

    // Assert
    Assert.Equal(allergen1, allergen2);
  }

  /// <summary>
  /// Verifies Allergen inequality for different values.
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

  #endregion

  #region Recipe Tests

  /// <summary>
  /// Verifies Recipe creates instance with default values using parameterless constructor.
  /// </summary>
  [Fact]
  public void Recipe_ParameterlessConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var recipe = new Recipe();

    // Assert
    Assert.Equal(string.Empty, recipe.Name);
    Assert.Equal(string.Empty, recipe.Description);
    Assert.Equal(-1, recipe.ApproximateTotalDuration);
    Assert.Equal(RecipeComplexity.UNKNOWN, recipe.Complexity);
    Assert.Empty(recipe.Ingredients);
    Assert.NotNull(recipe.ReferenceForMoreDetails);
    Assert.Equal("https://arolariu.ro/", recipe.ReferenceForMoreDetails.ToString());
  }

  /// <summary>
  /// Verifies Recipe parameterized constructor sets all properties.
  /// </summary>
  [Fact]
  public void Recipe_ParameterizedConstructor_SetsAllProperties()
  {
    // Arrange
    var name = "Spaghetti Carbonara";
    var description = "Classic Italian pasta dish";
    var duration = 30;
    var complexity = RecipeComplexity.NORMAL;
    var ingredients = new List<string> { "Pasta", "Eggs", "Bacon", "Cheese" };
    var reference = new Uri("https://example.com/recipes/carbonara");

    // Act
    var recipe = new Recipe(name, description, duration, complexity, ingredients, reference);

    // Assert
    Assert.Equal(name, recipe.Name);
    Assert.Equal(description, recipe.Description);
    Assert.Equal(duration, recipe.ApproximateTotalDuration);
    Assert.Equal(complexity, recipe.Complexity);
    Assert.Equal(ingredients, recipe.Ingredients);
    Assert.Equal(reference, recipe.ReferenceForMoreDetails);
  }

  /// <summary>
  /// Verifies Recipe properties can be set.
  /// </summary>
  [Fact]
  public void Recipe_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var recipe = new Recipe
    {
      Name = "Pizza Margherita",
      Description = "Traditional Italian pizza",
      ApproximateTotalDuration = 45,
      Complexity = RecipeComplexity.EASY
    };

    // Assert
    Assert.Equal("Pizza Margherita", recipe.Name);
    Assert.Equal("Traditional Italian pizza", recipe.Description);
    Assert.Equal(45, recipe.ApproximateTotalDuration);
    Assert.Equal(RecipeComplexity.EASY, recipe.Complexity);
  }

  /// <summary>
  /// Verifies Recipe same instance is equal to itself.
  /// </summary>
  [Fact]
  public void Recipe_SameInstance_IsEqual()
  {
    // Arrange
    var recipe = new Recipe { Name = "Test Recipe", ApproximateTotalDuration = 30 };

    // Assert
    Assert.Equal(recipe, recipe);
    Assert.Equal("Test Recipe", recipe.Name);
    Assert.Equal(30, recipe.ApproximateTotalDuration);
  }

  #endregion

  #region RecipeComplexity Enum Tests

  /// <summary>
  /// Verifies RecipeComplexity enum has expected values.
  /// </summary>
  [Theory]
  [InlineData(RecipeComplexity.UNKNOWN, 0)]
  [InlineData(RecipeComplexity.EASY, 1)]
  [InlineData(RecipeComplexity.NORMAL, 2)]
  [InlineData(RecipeComplexity.HARD, 3)]
  public void RecipeComplexity_EnumValues_HaveCorrectUnderlyingValues(RecipeComplexity complexity, int expectedValue)
  {
    // Assert
    Assert.Equal(expectedValue, (int)complexity);
  }

  /// <summary>
  /// Verifies all RecipeComplexity enum values can be parsed.
  /// </summary>
  [Theory]
  [InlineData("UNKNOWN")]
  [InlineData("EASY")]
  [InlineData("NORMAL")]
  [InlineData("HARD")]
  public void RecipeComplexity_ParseFromString_ReturnsCorrectValue(string complexityName)
  {
    // Act
    var parsed = Enum.Parse<RecipeComplexity>(complexityName);

    // Assert
    Assert.True(Enum.IsDefined<RecipeComplexity>(parsed));
  }

  #endregion

  #region Product Tests

  /// <summary>
  /// Verifies Product creates instance with default values.
  /// </summary>
  [Fact]
  public void Product_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var product = new Product();

    // Assert
    Assert.Equal(string.Empty, product.Name);
    Assert.Equal(ProductCategory.OTHER, product.Category);
    Assert.Equal(0, product.Quantity);
    Assert.Equal(string.Empty, product.QuantityUnit);
    Assert.Equal(string.Empty, product.ProductCode);
    Assert.Equal(0, product.Price);
    Assert.Empty(product.DetectedAllergens);
    Assert.Equal(default, product.Metadata);
  }

  /// <summary>
  /// Verifies Product properties can be set.
  /// </summary>
  [Fact]
  public void Product_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var allergens = new List<Allergen> { new Allergen { Name = "Gluten" } };
    var product = new Product
    {
      Name = "MONSTER ENERGY DRINK 500ML",
      Category = ProductCategory.BEVERAGES,
      Quantity = 2,
      QuantityUnit = "pcs",
      ProductCode = "SKU12345",
      Price = 5.99m,
      DetectedAllergens = allergens
    };

    // Assert
    Assert.Equal("MONSTER ENERGY DRINK 500ML", product.Name);
    Assert.Equal(ProductCategory.BEVERAGES, product.Category);
    Assert.Equal(2, product.Quantity);
    Assert.Equal("pcs", product.QuantityUnit);
    Assert.Equal("SKU12345", product.ProductCode);
    Assert.Equal(5.99m, product.Price);
    Assert.Single(product.DetectedAllergens);
  }

  /// <summary>
  /// Verifies Product TotalPrice computed property calculates correctly.
  /// </summary>
  [Fact]
  public void Product_TotalPrice_CalculatesCorrectly()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 3,
      Price = 10.00m
    };

    // Assert
    Assert.Equal(30.00m, product.TotalPrice);
  }

  /// <summary>
  /// Verifies Product TotalPrice returns zero when quantity is zero.
  /// </summary>
  [Fact]
  public void Product_TotalPrice_QuantityZero_ReturnsZero()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 0,
      Price = 10.00m
    };

    // Assert
    Assert.Equal(0, product.TotalPrice);
  }

  /// <summary>
  /// Verifies Product TotalPrice returns zero when price is zero.
  /// </summary>
  [Fact]
  public void Product_TotalPrice_PriceZero_ReturnsZero()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 5,
      Price = 0
    };

    // Assert
    Assert.Equal(0, product.TotalPrice);
  }

  /// <summary>
  /// Verifies Product TotalPrice handles decimal calculations correctly.
  /// </summary>
  [Fact]
  public void Product_TotalPrice_DecimalValues_CalculatesCorrectly()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 2.5m,
      Price = 4.99m
    };

    // Assert
    Assert.Equal(12.475m, product.TotalPrice);
  }

  #endregion

  #region ProductMetadata Tests

  /// <summary>
  /// Verifies ProductMetadata creates instance with default false values.
  /// </summary>
  [Fact]
  public void ProductMetadata_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var metadata = new ProductMetadata();

    // Assert
    Assert.False(metadata.IsEdited);
    Assert.False(metadata.IsComplete);
    Assert.False(metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies ProductMetadata properties can be set.
  /// </summary>
  [Fact]
  public void ProductMetadata_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var metadata = new ProductMetadata
    {
      IsEdited = true,
      IsComplete = true,
      IsSoftDeleted = false
    };

    // Assert
    Assert.True(metadata.IsEdited);
    Assert.True(metadata.IsComplete);
    Assert.False(metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies ProductMetadata equality based on value.
  /// </summary>
  [Fact]
  public void ProductMetadata_SameValues_AreEqual()
  {
    // Arrange
    var metadata1 = new ProductMetadata { IsEdited = true, IsComplete = false, IsSoftDeleted = false };
    var metadata2 = new ProductMetadata { IsEdited = true, IsComplete = false, IsSoftDeleted = false };

    // Assert
    Assert.Equal(metadata1, metadata2);
  }

  /// <summary>
  /// Verifies ProductMetadata inequality for different values.
  /// </summary>
  [Fact]
  public void ProductMetadata_DifferentValues_AreNotEqual()
  {
    // Arrange
    var metadata1 = new ProductMetadata { IsEdited = true };
    var metadata2 = new ProductMetadata { IsEdited = false };

    // Assert
    Assert.NotEqual(metadata1, metadata2);
  }

  /// <summary>
  /// Verifies ProductMetadata represents soft delete state correctly.
  /// </summary>
  [Fact]
  public void ProductMetadata_SoftDeleted_StateIsCorrect()
  {
    // Arrange
    var metadata = new ProductMetadata { IsSoftDeleted = true };

    // Assert
    Assert.True(metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies ProductMetadata hash code is consistent for same values.
  /// </summary>
  [Fact]
  public void ProductMetadata_SameValues_HaveSameHashCode()
  {
    // Arrange
    var metadata1 = new ProductMetadata { IsEdited = true, IsComplete = true, IsSoftDeleted = false };
    var metadata2 = new ProductMetadata { IsEdited = true, IsComplete = true, IsSoftDeleted = false };

    // Assert
    Assert.Equal(metadata1.GetHashCode(), metadata2.GetHashCode());
  }

  #endregion

  #region ProductCategory Enum Tests (if exists)

  /// <summary>
  /// Verifies ProductCategory.OTHER is the default category.
  /// </summary>
  [Fact]
  public void ProductCategory_Default_IsOther()
  {
    // Arrange
    var product = new Product();

    // Assert
    Assert.Equal(ProductCategory.OTHER, product.Category);
  }

  /// <summary>
  /// Verifies ProductCategory can be set to different values.
  /// </summary>
  [Theory]
  [InlineData(ProductCategory.NOT_DEFINED)]
  [InlineData(ProductCategory.BAKED_GOODS)]
  [InlineData(ProductCategory.GROCERIES)]
  [InlineData(ProductCategory.DAIRY)]
  [InlineData(ProductCategory.MEAT)]
  [InlineData(ProductCategory.FISH)]
  [InlineData(ProductCategory.FRUITS)]
  [InlineData(ProductCategory.VEGETABLES)]
  [InlineData(ProductCategory.BEVERAGES)]
  [InlineData(ProductCategory.ALCOHOLIC_BEVERAGES)]
  [InlineData(ProductCategory.TOBACCO)]
  [InlineData(ProductCategory.CLEANING_SUPPLIES)]
  [InlineData(ProductCategory.PERSONAL_CARE)]
  [InlineData(ProductCategory.MEDICINE)]
  [InlineData(ProductCategory.OTHER)]
  public void ProductCategory_CanBeSetToAnyValue(ProductCategory category)
  {
    // Arrange
    var product = new Product { Category = category };

    // Assert
    Assert.Equal(category, product.Category);
  }

  #endregion
}
