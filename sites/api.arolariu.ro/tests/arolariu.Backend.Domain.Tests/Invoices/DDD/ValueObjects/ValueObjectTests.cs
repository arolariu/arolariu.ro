namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Comprehensive unit tests for all Value Object classes in the invoicing domain.
/// Tests validate property initialization, equality semantics, default values, and record behavior.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
[TestClass]
public sealed class ValueObjectTests
{
  #region Currency Tests

  /// <summary>
  /// Verifies Currency struct can be created with all parameters.
  /// </summary>
  [TestMethod]
  public void Currency_ParameterizedConstructor_SetsAllProperties()
  {
    // Arrange & Act
    var currency = new Currency("US Dollar", "USD", "$");

    // Assert
    Assert.AreEqual("US Dollar", currency.Name);
    Assert.AreEqual("USD", currency.Code);
    Assert.AreEqual("$", currency.Symbol);
  }

  /// <summary>
  /// Verifies Currency default constructor creates instance with default values.
  /// </summary>
  [TestMethod]
  public void Currency_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var currency = new Currency();

    // Assert
    Assert.IsNull(currency.Name);
    Assert.IsNull(currency.Code);
    Assert.IsNull(currency.Symbol);
  }

  /// <summary>
  /// Verifies Currency equality based on value.
  /// </summary>
  [TestMethod]
  public void Currency_SameValues_AreEqual()
  {
    // Arrange
    var currency1 = new Currency("Euro", "EUR", "€");
    var currency2 = new Currency("Euro", "EUR", "€");

    // Assert
    Assert.AreEqual(currency1, currency2);
    Assert.IsTrue(currency1 == currency2);
  }

  /// <summary>
  /// Verifies Currency inequality for different values.
  /// </summary>
  [TestMethod]
  public void Currency_DifferentValues_AreNotEqual()
  {
    // Arrange
    var currency1 = new Currency("US Dollar", "USD", "$");
    var currency2 = new Currency("Euro", "EUR", "€");

    // Assert
    Assert.AreNotEqual(currency1, currency2);
    Assert.IsTrue(currency1 != currency2);
  }

  /// <summary>
  /// Verifies Currency has consistent hash code for same values.
  /// </summary>
  [TestMethod]
  public void Currency_SameValues_HaveSameHashCode()
  {
    // Arrange
    var currency1 = new Currency("British Pound", "GBP", "£");
    var currency2 = new Currency("British Pound", "GBP", "£");

    // Assert
    Assert.AreEqual(currency1.GetHashCode(), currency2.GetHashCode());
  }

  /// <summary>
  /// Verifies Currency has Serializable attribute.
  /// </summary>
  [TestMethod]
  public void Currency_HasSerializableAttribute()
  {
    // Assert
    Assert.IsTrue(Attribute.IsDefined(typeof(Currency), typeof(SerializableAttribute)));
  }

  #endregion

  #region ContactInformation Tests

  /// <summary>
  /// Verifies ContactInformation creates instance with default empty values.
  /// </summary>
  [TestMethod]
  public void ContactInformation_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var contact = new ContactInformation();

    // Assert
    Assert.AreEqual(string.Empty, contact.FullName);
    Assert.AreEqual(string.Empty, contact.Address);
    Assert.AreEqual(string.Empty, contact.PhoneNumber);
    Assert.AreEqual(string.Empty, contact.EmailAddress);
    Assert.AreEqual(string.Empty, contact.Website);
  }

  /// <summary>
  /// Verifies ContactInformation properties can be set.
  /// </summary>
  [TestMethod]
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
    Assert.AreEqual("John Doe", contact.FullName);
    Assert.AreEqual("123 Main St", contact.Address);
    Assert.AreEqual("+1234567890", contact.PhoneNumber);
    Assert.AreEqual("john@example.com", contact.EmailAddress);
    Assert.AreEqual("https://example.com", contact.Website);
  }

  /// <summary>
  /// Verifies ContactInformation equality based on value.
  /// </summary>
  [TestMethod]
  public void ContactInformation_SameValues_AreEqual()
  {
    // Arrange
    var contact1 = new ContactInformation { FullName = "Test", EmailAddress = "test@test.com" };
    var contact2 = new ContactInformation { FullName = "Test", EmailAddress = "test@test.com" };

    // Assert
    Assert.AreEqual(contact1, contact2);
  }

  /// <summary>
  /// Verifies ContactInformation has Serializable attribute.
  /// </summary>
  [TestMethod]
  public void ContactInformation_HasSerializableAttribute()
  {
    // Assert
    Assert.IsTrue(Attribute.IsDefined(typeof(ContactInformation), typeof(SerializableAttribute)));
  }

  #endregion

  #region PaymentInformation Tests

  /// <summary>
  /// Verifies PaymentInformation creates instance with default values.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var payment = new PaymentInformation();

    // Assert
    Assert.AreEqual(PaymentType.UNKNOWN, payment.PaymentType);
    Assert.AreEqual(0.0m, payment.TotalCostAmount);
    Assert.AreEqual(0.0m, payment.TotalTaxAmount);
    Assert.AreNotEqual(default, payment.TransactionDate);
    Assert.AreEqual("Romanian Leu", payment.Currency.Name);
    Assert.AreEqual("RON", payment.Currency.Code);
    Assert.AreEqual("lei", payment.Currency.Symbol);
  }

  /// <summary>
  /// Verifies PaymentInformation properties can be set.
  /// </summary>
  [TestMethod]
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
    Assert.AreEqual(transactionDate, payment.TransactionDate);
    Assert.AreEqual(PaymentType.CARD, payment.PaymentType);
    Assert.AreEqual("USD", payment.Currency.Code);
    Assert.AreEqual(100.50m, payment.TotalCostAmount);
    Assert.AreEqual(19.00m, payment.TotalTaxAmount);
  }

  /// <summary>
  /// Verifies PaymentInformation equality based on value.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SameValues_AreEqual()
  {
    // Arrange
    var date = DateTimeOffset.UtcNow;
    var payment1 = new PaymentInformation { TransactionDate = date, TotalCostAmount = 50m };
    var payment2 = new PaymentInformation { TransactionDate = date, TotalCostAmount = 50m };

    // Assert
    Assert.AreEqual(payment1, payment2);
  }

  /// <summary>
  /// Verifies PaymentInformation has Serializable attribute.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_HasSerializableAttribute()
  {
    // Assert
    Assert.IsTrue(Attribute.IsDefined(typeof(PaymentInformation), typeof(SerializableAttribute)));
  }

  #endregion

  #region PaymentType Enum Tests

  /// <summary>
  /// Verifies PaymentType enum has expected values.
  /// </summary>
  [TestMethod]
  [DataRow(PaymentType.UNKNOWN, 0)]
  [DataRow(PaymentType.CASH, 100)]
  [DataRow(PaymentType.CARD, 200)]
  [DataRow(PaymentType.TRANSFER, 300)]
  [DataRow(PaymentType.MOBILEPAYMENT, 400)]
  [DataRow(PaymentType.VOUCHER, 500)]
  [DataRow(PaymentType.Other, 9999)]
  public void PaymentType_EnumValues_HaveCorrectUnderlyingValues(PaymentType paymentType, int expectedValue)
  {
    // Assert
    Assert.AreEqual(expectedValue, (int)paymentType);
  }

  /// <summary>
  /// Verifies all PaymentType enum values can be parsed.
  /// </summary>
  [TestMethod]
  [DataRow("UNKNOWN")]
  [DataRow("CASH")]
  [DataRow("CARD")]
  [DataRow("TRANSFER")]
  [DataRow("MOBILEPAYMENT")]
  [DataRow("VOUCHER")]
  [DataRow("Other")]
  public void PaymentType_ParseFromString_ReturnsCorrectValue(string paymentTypeName)
  {
    // Act
    var parsed = Enum.Parse<PaymentType>(paymentTypeName);

    // Assert
    Assert.IsTrue(Enum.IsDefined<PaymentType>(parsed));
  }

  #endregion

  #region Allergen Tests

  /// <summary>
  /// Verifies Allergen creates instance with default values.
  /// </summary>
  [TestMethod]
  public void Allergen_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var allergen = new Allergen();

    // Assert
    Assert.AreEqual(string.Empty, allergen.Name);
    Assert.AreEqual(string.Empty, allergen.Description);
    Assert.IsNotNull(allergen.LearnMoreAddress);
    Assert.AreEqual("https://arolariu.ro/", allergen.LearnMoreAddress.ToString());
  }

  /// <summary>
  /// Verifies Allergen properties can be set.
  /// </summary>
  [TestMethod]
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
    Assert.AreEqual("Peanuts", allergen.Name);
    Assert.AreEqual("Common tree nut allergen", allergen.Description);
    Assert.AreEqual("https://example.com/allergens/peanuts", allergen.LearnMoreAddress.ToString());
  }

  /// <summary>
  /// Verifies Allergen equality based on value.
  /// </summary>
  [TestMethod]
  public void Allergen_SameValues_AreEqual()
  {
    // Arrange
    var allergen1 = new Allergen { Name = "Gluten", Description = "Wheat protein" };
    var allergen2 = new Allergen { Name = "Gluten", Description = "Wheat protein" };

    // Assert
    Assert.AreEqual(allergen1, allergen2);
  }

  /// <summary>
  /// Verifies Allergen inequality for different values.
  /// </summary>
  [TestMethod]
  public void Allergen_DifferentValues_AreNotEqual()
  {
    // Arrange
    var allergen1 = new Allergen { Name = "Gluten" };
    var allergen2 = new Allergen { Name = "Dairy" };

    // Assert
    Assert.AreNotEqual(allergen1, allergen2);
  }

  #endregion

  #region Recipe Tests

  /// <summary>
  /// Verifies Recipe creates instance with default values using parameterless constructor.
  /// </summary>
  [TestMethod]
  public void Recipe_ParameterlessConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var recipe = new Recipe();

    // Assert
    Assert.AreEqual(string.Empty, recipe.Name);
    Assert.AreEqual(string.Empty, recipe.Description);
    Assert.AreEqual(-1, recipe.ApproximateTotalDuration);
    Assert.AreEqual(RecipeComplexity.UNKNOWN, recipe.Complexity);
    Assert.IsEmpty(recipe.Ingredients);
    Assert.IsNotNull(recipe.ReferenceForMoreDetails);
    Assert.AreEqual("https://arolariu.ro/", recipe.ReferenceForMoreDetails.ToString());
  }

  /// <summary>
  /// Verifies Recipe parameterized constructor sets all properties.
  /// </summary>
  [TestMethod]
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
    Assert.AreEqual(name, recipe.Name);
    Assert.AreEqual(description, recipe.Description);
    Assert.AreEqual(duration, recipe.ApproximateTotalDuration);
    Assert.AreEqual(complexity, recipe.Complexity);
    Assert.AreSequenceEqual(ingredients, recipe.Ingredients);
    Assert.AreEqual(reference, recipe.ReferenceForMoreDetails);
  }

  /// <summary>
  /// Verifies Recipe properties can be set.
  /// </summary>
  [TestMethod]
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
    Assert.AreEqual("Pizza Margherita", recipe.Name);
    Assert.AreEqual("Traditional Italian pizza", recipe.Description);
    Assert.AreEqual(45, recipe.ApproximateTotalDuration);
    Assert.AreEqual(RecipeComplexity.EASY, recipe.Complexity);
  }

  /// <summary>
  /// Verifies Recipe same instance is equal to itself.
  /// </summary>
  [TestMethod]
  public void Recipe_SameInstance_IsEqual()
  {
    // Arrange
    var recipe = new Recipe { Name = "Test Recipe", ApproximateTotalDuration = 30 };

    // Assert
    Assert.AreEqual(recipe, recipe);
    Assert.AreEqual("Test Recipe", recipe.Name);
    Assert.AreEqual(30, recipe.ApproximateTotalDuration);
  }

  #endregion

  #region RecipeComplexity Enum Tests

  /// <summary>
  /// Verifies RecipeComplexity enum has expected values.
  /// </summary>
  [TestMethod]
  [DataRow(RecipeComplexity.UNKNOWN, 0)]
  [DataRow(RecipeComplexity.EASY, 1)]
  [DataRow(RecipeComplexity.NORMAL, 2)]
  [DataRow(RecipeComplexity.HARD, 3)]
  public void RecipeComplexity_EnumValues_HaveCorrectUnderlyingValues(RecipeComplexity complexity, int expectedValue)
  {
    // Assert
    Assert.AreEqual(expectedValue, (int)complexity);
  }

  /// <summary>
  /// Verifies all RecipeComplexity enum values can be parsed.
  /// </summary>
  [TestMethod]
  [DataRow("UNKNOWN")]
  [DataRow("EASY")]
  [DataRow("NORMAL")]
  [DataRow("HARD")]
  public void RecipeComplexity_ParseFromString_ReturnsCorrectValue(string complexityName)
  {
    // Act
    var parsed = Enum.Parse<RecipeComplexity>(complexityName);

    // Assert
    Assert.IsTrue(Enum.IsDefined<RecipeComplexity>(parsed));
  }

  #endregion

  #region Product Tests

  /// <summary>
  /// Verifies Product creates instance with default values.
  /// </summary>
  [TestMethod]
  public void Product_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var product = new Product();

    // Assert
    Assert.AreEqual(string.Empty, product.Name);
    Assert.AreEqual(ProductCategory.OTHER, product.Category);
    Assert.AreEqual(0, product.Quantity);
    Assert.AreEqual(string.Empty, product.QuantityUnit);
    Assert.AreEqual(string.Empty, product.ProductCode);
    Assert.AreEqual(0, product.Price);
    Assert.IsEmpty(product.DetectedAllergens);
    Assert.AreEqual(default, product.Metadata);
  }

  /// <summary>
  /// Verifies Product properties can be set.
  /// </summary>
  [TestMethod]
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
    Assert.AreEqual("MONSTER ENERGY DRINK 500ML", product.Name);
    Assert.AreEqual(ProductCategory.BEVERAGES, product.Category);
    Assert.AreEqual(2, product.Quantity);
    Assert.AreEqual("pcs", product.QuantityUnit);
    Assert.AreEqual("SKU12345", product.ProductCode);
    Assert.AreEqual(5.99m, product.Price);
    Assert.ContainsSingle(product.DetectedAllergens);
  }

  /// <summary>
  /// Verifies Product TotalPrice computed property calculates correctly.
  /// </summary>
  [TestMethod]
  public void Product_TotalPrice_CalculatesCorrectly()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 3,
      Price = 10.00m
    };

    // Assert
    Assert.AreEqual(30.00m, product.TotalPrice);
  }

  /// <summary>
  /// Verifies Product TotalPrice returns zero when quantity is zero.
  /// </summary>
  [TestMethod]
  public void Product_TotalPrice_QuantityZero_ReturnsZero()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 0,
      Price = 10.00m
    };

    // Assert
    Assert.AreEqual(0, product.TotalPrice);
  }

  /// <summary>
  /// Verifies Product TotalPrice returns zero when price is zero.
  /// </summary>
  [TestMethod]
  public void Product_TotalPrice_PriceZero_ReturnsZero()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 5,
      Price = 0
    };

    // Assert
    Assert.AreEqual(0, product.TotalPrice);
  }

  /// <summary>
  /// Verifies Product TotalPrice handles decimal calculations correctly.
  /// </summary>
  [TestMethod]
  public void Product_TotalPrice_DecimalValues_CalculatesCorrectly()
  {
    // Arrange
    var product = new Product
    {
      Quantity = 2.5m,
      Price = 4.99m
    };

    // Assert
    Assert.AreEqual(12.475m, product.TotalPrice);
  }

  #endregion

  #region ProductMetadata Tests

  /// <summary>
  /// Verifies ProductMetadata creates instance with default false values.
  /// </summary>
  [TestMethod]
  public void ProductMetadata_DefaultConstructor_CreatesInstanceWithDefaults()
  {
    // Act
    var metadata = new ProductMetadata();

    // Assert
    Assert.IsFalse(metadata.IsEdited);
    Assert.IsFalse(metadata.IsComplete);
    Assert.IsFalse(metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies ProductMetadata properties can be set.
  /// </summary>
  [TestMethod]
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
    Assert.IsTrue(metadata.IsEdited);
    Assert.IsTrue(metadata.IsComplete);
    Assert.IsFalse(metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies ProductMetadata equality based on value.
  /// </summary>
  [TestMethod]
  public void ProductMetadata_SameValues_AreEqual()
  {
    // Arrange
    var metadata1 = new ProductMetadata { IsEdited = true, IsComplete = false, IsSoftDeleted = false };
    var metadata2 = new ProductMetadata { IsEdited = true, IsComplete = false, IsSoftDeleted = false };

    // Assert
    Assert.AreEqual(metadata1, metadata2);
  }

  /// <summary>
  /// Verifies ProductMetadata inequality for different values.
  /// </summary>
  [TestMethod]
  public void ProductMetadata_DifferentValues_AreNotEqual()
  {
    // Arrange
    var metadata1 = new ProductMetadata { IsEdited = true };
    var metadata2 = new ProductMetadata { IsEdited = false };

    // Assert
    Assert.AreNotEqual(metadata1, metadata2);
  }

  /// <summary>
  /// Verifies ProductMetadata represents soft delete state correctly.
  /// </summary>
  [TestMethod]
  public void ProductMetadata_SoftDeleted_StateIsCorrect()
  {
    // Arrange
    var metadata = new ProductMetadata { IsSoftDeleted = true };

    // Assert
    Assert.IsTrue(metadata.IsSoftDeleted);
  }

  /// <summary>
  /// Verifies ProductMetadata hash code is consistent for same values.
  /// </summary>
  [TestMethod]
  public void ProductMetadata_SameValues_HaveSameHashCode()
  {
    // Arrange
    var metadata1 = new ProductMetadata { IsEdited = true, IsComplete = true, IsSoftDeleted = false };
    var metadata2 = new ProductMetadata { IsEdited = true, IsComplete = true, IsSoftDeleted = false };

    // Assert
    Assert.AreEqual(metadata1.GetHashCode(), metadata2.GetHashCode());
  }

  #endregion

  #region ProductCategory Enum Tests (if exists)

  /// <summary>
  /// Verifies ProductCategory.OTHER is the default category.
  /// </summary>
  [TestMethod]
  public void ProductCategory_Default_IsOther()
  {
    // Arrange
    var product = new Product();

    // Assert
    Assert.AreEqual(ProductCategory.OTHER, product.Category);
  }

  /// <summary>
  /// Verifies ProductCategory can be set to different values.
  /// </summary>
  [TestMethod]
  [DataRow(ProductCategory.NOT_DEFINED)]
  [DataRow(ProductCategory.BAKED_GOODS)]
  [DataRow(ProductCategory.GROCERIES)]
  [DataRow(ProductCategory.DAIRY)]
  [DataRow(ProductCategory.MEAT)]
  [DataRow(ProductCategory.FISH)]
  [DataRow(ProductCategory.FRUITS)]
  [DataRow(ProductCategory.VEGETABLES)]
  [DataRow(ProductCategory.BEVERAGES)]
  [DataRow(ProductCategory.ALCOHOLIC_BEVERAGES)]
  [DataRow(ProductCategory.TOBACCO)]
  [DataRow(ProductCategory.CLEANING_SUPPLIES)]
  [DataRow(ProductCategory.PERSONAL_CARE)]
  [DataRow(ProductCategory.MEDICINE)]
  [DataRow(ProductCategory.OTHER)]
  public void ProductCategory_CanBeSetToAnyValue(ProductCategory category)
  {
    // Arrange
    var product = new Product { Category = category };

    // Assert
    Assert.AreEqual(category, product.Category);
  }

  #endregion
}
