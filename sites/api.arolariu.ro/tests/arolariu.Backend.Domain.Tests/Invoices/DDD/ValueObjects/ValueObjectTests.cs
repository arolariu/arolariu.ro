namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Builders;

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
    Assert.IsNull(product.Classification);
    Assert.AreEqual(0, product.Quantity);
    Assert.AreEqual(string.Empty, product.QuantityUnit);
    Assert.AreEqual(string.Empty, product.ProductCode);
    Assert.AreEqual(0, product.Price);
    Assert.IsNull(product.AllergenAssessment);
    Assert.AreEqual(default, product.Metadata);
  }

  /// <summary>
  /// Verifies Product properties can be set.
  /// </summary>
  [TestMethod]
  public void Product_SetProperties_PropertiesAreSet()
  {
    // Arrange
    var signals = new List<AllergenSignal>
    {
      new(AllergenCode.CerealsContainingGluten, AllergenEvidenceLevel.Explicit, 0.9, [new AllergenEvidence("product-name", "Gluten")]),
    };

    var product = new Product
    {
      Name = "MONSTER ENERGY DRINK 500ML",
      Classification = ClassificationTestData.Gpc("10000123", "Energy Drinks"),
      Quantity = 2,
      QuantityUnit = "pcs",
      ProductCode = "SKU12345",
      Price = 5.99m,
      AllergenAssessment = AllergenAssessment.Detected(Guid.NewGuid(), signals)
    };

    // Assert
    Assert.AreEqual("MONSTER ENERGY DRINK 500ML", product.Name);
    Assert.AreEqual("10000123", product.Classification!.Code);
    Assert.AreEqual(2, product.Quantity);
    Assert.AreEqual("pcs", product.QuantityUnit);
    Assert.AreEqual("SKU12345", product.ProductCode);
    Assert.AreEqual(5.99m, product.Price);
    Assert.ContainsSingle(product.AllergenAssessment!.Signals);
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

  #region Product Classification And Allergen Tests

  /// <summary>
  /// Verifies a freshly constructed Product is unclassified and carries no allergen assessment.
  /// </summary>
  [TestMethod]
  public void Product_Default_IsUnclassifiedAndUnassessed()
  {
    // Arrange
    var product = new Product();

    // Assert
    Assert.IsNull(product.Classification);
    Assert.IsNull(product.AllergenAssessment);
  }

  /// <summary>
  /// Verifies Product classification accepts a GS1 GPC classification.
  /// </summary>
  [TestMethod]
  public void Product_SetClassification_ClassificationIsSet()
  {
    // Arrange
    var classification = ClassificationTestData.Gpc("10000045", "Milk (Perishable)");

    var product = new Product { Classification = classification };

    // Assert
    Assert.AreEqual(classification, product.Classification);
    Assert.AreEqual(ClassificationSystem.Gs1Gpc, product.Classification!.System);
  }

  /// <summary>
  /// Verifies Product allergen assessment accepts a no-signal assessment.
  /// </summary>
  [TestMethod]
  public void Product_SetAllergenAssessment_AssessmentIsSet()
  {
    // Arrange
    var runIdentifier = Guid.NewGuid();
    var assessment = AllergenAssessment.NoSignals(runIdentifier);

    var product = new Product { AllergenAssessment = assessment };

    // Assert
    Assert.IsNotNull(product.AllergenAssessment);
    Assert.AreEqual(runIdentifier, product.AllergenAssessment!.SourceRunId);
  }

  /// <summary>
  /// Verifies Product remains identity-free after the analysis cutover.
  /// </summary>
  /// <remarks>
  /// <para>Products are value objects owned by an invoice. Adding an identifier would silently promote them to
  /// entities and break the aggregate boundary, so the absence of one is asserted rather than assumed.</para>
  /// </remarks>
  [TestMethod]
  public void Product_Type_ExposesNoIdentifier()
  {
    // Act
    var identityMembers = typeof(Product)
      .GetProperties()
      .Where(property =>
        property.Name.Equals("id", StringComparison.OrdinalIgnoreCase)
        || property.Name.Equals("Id", StringComparison.Ordinal)
        || property.Name.EndsWith("Identifier", StringComparison.Ordinal))
      .Select(property => property.Name)
      .ToList();

    // Assert
    Assert.AreEqual(0, identityMembers.Count, $"Product must stay identity-free but exposes: {string.Join(", ", identityMembers)}.");
  }

  #endregion
}
