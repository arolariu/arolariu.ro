namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Entities;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Builders;

using Xunit;

/// <summary>
/// Comprehensive unit tests for all Entity classes in the invoicing domain.
/// Tests validate property initialization, public API behavior, and entity constraints.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class EntityTests
{
  #region Invoice Property Tests

  /// <summary>
  /// Verifies Invoice can be created with required properties.
  /// </summary>
  [Fact]
  public void Invoice_Creation_WithRequiredProperties_Succeeds()
  {
    // Act
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid()
    };

    // Assert
    Assert.NotNull(invoice);
    Assert.NotEqual(Guid.Empty, invoice.id);
    Assert.NotEqual(Guid.Empty, invoice.UserIdentifier);
  }

  /// <summary>
  /// Verifies Invoice has default empty collections.
  /// </summary>
  [Fact]
  public void Invoice_DefaultCollections_AreEmpty()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    // Assert
    Assert.NotNull(invoice.SharedWith);
    Assert.NotNull(invoice.Scans);
    Assert.NotNull(invoice.Items);
    Assert.NotNull(invoice.PossibleRecipes);
    Assert.NotNull(invoice.AdditionalMetadata);
  }

  /// <summary>
  /// Verifies Invoice default category is NOT_DEFINED.
  /// </summary>
  [Fact]
  public void Invoice_DefaultCategory_IsNotDefined()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid()
    };

    // Assert
    Assert.Equal(InvoiceCategory.NOT_DEFINED, invoice.Category);
  }

  /// <summary>
  /// Verifies Invoice default MerchantReference is empty GUID.
  /// </summary>
  [Fact]
  public void Invoice_DefaultMerchantReference_IsEmptyGuid()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid()
    };

    // Assert
    Assert.Equal(Guid.Empty, invoice.MerchantReference);
  }

  /// <summary>
  /// Verifies Invoice category can be set to different values.
  /// </summary>
  [Theory]
  [InlineData(InvoiceCategory.NOT_DEFINED)]
  [InlineData(InvoiceCategory.GROCERY)]
  [InlineData(InvoiceCategory.FAST_FOOD)]
  [InlineData(InvoiceCategory.HOME_CLEANING)]
  [InlineData(InvoiceCategory.CAR_AUTO)]
  [InlineData(InvoiceCategory.OTHER)]
  public void Invoice_SetCategory_CategoryIsSet(InvoiceCategory category)
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Category = category
    };

    // Assert
    Assert.Equal(category, invoice.Category);
  }

  /// <summary>
  /// Verifies Invoice Name can be set.
  /// </summary>
  [Fact]
  public void Invoice_SetName_NameIsSet()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Name = "Test Invoice"
    };

    // Assert
    Assert.Equal("Test Invoice", invoice.Name);
  }

  /// <summary>
  /// Verifies Invoice Description can be set.
  /// </summary>
  [Fact]
  public void Invoice_SetDescription_DescriptionIsSet()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Description = "Test Description"
    };

    // Assert
    Assert.Equal("Test Description", invoice.Description);
  }

  /// <summary>
  /// Verifies Invoice IsImportant defaults to false.
  /// </summary>
  [Fact]
  public void Invoice_DefaultIsImportant_IsFalse()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid()
    };

    // Assert
    Assert.False(invoice.IsImportant);
  }

  /// <summary>
  /// Verifies Invoice IsImportant can be set to true.
  /// </summary>
  [Fact]
  public void Invoice_SetIsImportant_IsImportantIsSet()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      IsImportant = true
    };

    // Assert
    Assert.True(invoice.IsImportant);
  }

  /// <summary>
  /// Verifies Invoice Items collection can be populated.
  /// </summary>
  [Fact]
  public void Invoice_AddItems_ItemsAreAdded()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Items = new List<Product>
            {
                new Product { Name = "Item 1", Price = 10.00m, Quantity = 2 },
                new Product { Name = "Item 2", Price = 5.00m, Quantity = 1 }
            }
    };

    // Assert
    Assert.Equal(2, invoice.Items.Count);
  }

  /// <summary>
  /// Verifies Invoice PaymentInformation can be set.
  /// </summary>
  [Fact]
  public void Invoice_SetPaymentInformation_PaymentInformationIsSet()
  {
    // Arrange
    var paymentInfo = new PaymentInformation
    {
      PaymentType = PaymentType.CARD,
      TotalCostAmount = 100.00m,
      TotalTaxAmount = 19.00m
    };
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      PaymentInformation = paymentInfo
    };

    // Assert
    Assert.Equal(PaymentType.CARD, invoice.PaymentInformation.PaymentType);
    Assert.Equal(100.00m, invoice.PaymentInformation.TotalCostAmount);
    Assert.Equal(19.00m, invoice.PaymentInformation.TotalTaxAmount);
  }

  /// <summary>
  /// Verifies Invoice MerchantReference can be set.
  /// </summary>
  [Fact]
  public void Invoice_SetMerchantReference_MerchantReferenceIsSet()
  {
    // Arrange
    var merchantId = Guid.NewGuid();
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      MerchantReference = merchantId
    };

    // Assert
    Assert.Equal(merchantId, invoice.MerchantReference);
  }

  /// <summary>
  /// Verifies Invoice PossibleRecipes collection can be populated.
  /// </summary>
  [Fact]
  public void Invoice_AddPossibleRecipes_RecipesAreAdded()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      PossibleRecipes = new List<Recipe>
            {
                new Recipe { Name = "Recipe 1", Complexity = RecipeComplexity.EASY },
                new Recipe { Name = "Recipe 2", Complexity = RecipeComplexity.HARD }
            }
    };

    // Assert
    Assert.Equal(2, invoice.PossibleRecipes.Count);
  }

  /// <summary>
  /// Verifies Invoice AdditionalMetadata can be populated.
  /// </summary>
  [Fact]
  public void Invoice_AddMetadata_MetadataIsAdded()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      AdditionalMetadata = new Dictionary<string, object>
            {
                { "key1", "value1" },
                { "key2", 42 }
            }
    };

    // Assert
    Assert.Equal(2, invoice.AdditionalMetadata.Count);
    Assert.Equal("value1", invoice.AdditionalMetadata["key1"]);
    Assert.Equal(42, invoice.AdditionalMetadata["key2"]);
  }

  /// <summary>
  /// Verifies PerformUpdate sets LastUpdatedBy.
  /// </summary>
  [Fact]
  public void Invoice_PerformUpdate_SetsLastUpdatedBy()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var updatedById = Guid.NewGuid();

    // Act
    invoice.PerformUpdate(updatedById);

    // Assert
    Assert.Equal(updatedById, invoice.LastUpdatedBy);
  }

  /// <summary>
  /// Verifies PerformUpdate sets LastUpdatedAt to current time.
  /// </summary>
  [Fact]
  public void Invoice_PerformUpdate_SetsLastUpdatedAt()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var beforeUpdate = DateTimeOffset.Now.AddSeconds(-1);

    // Act
    invoice.PerformUpdate(Guid.NewGuid());

    // Assert
    Assert.True(invoice.LastUpdatedAt >= beforeUpdate);
  }

  /// <summary>
  /// Verifies PerformUpdate increments NumberOfUpdates.
  /// </summary>
  [Fact]
  public void Invoice_PerformUpdate_IncrementsNumberOfUpdates()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var initialCount = invoice.NumberOfUpdates;

    // Act
    invoice.PerformUpdate(Guid.NewGuid());

    // Assert
    Assert.Equal(initialCount + 1, invoice.NumberOfUpdates);
  }

  /// <summary>
  /// Verifies multiple PerformUpdate calls increment count correctly.
  /// </summary>
  [Fact]
  public void Invoice_PerformUpdate_MultipleCalls_IncrementsCorrectly()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var initialCount = invoice.NumberOfUpdates;

    // Act
    invoice.PerformUpdate(Guid.NewGuid());
    invoice.PerformUpdate(Guid.NewGuid());
    invoice.PerformUpdate(Guid.NewGuid());

    // Assert
    Assert.Equal(initialCount + 3, invoice.NumberOfUpdates);
  }

  #endregion

  #region Merchant Property Tests

  /// <summary>
  /// Verifies Merchant can be created with valid properties.
  /// </summary>
  [Fact]
  public void Merchant_Creation_WithValidProperties_Succeeds()
  {
    // Act
    var merchant = new Merchant
    {
      id = Guid.NewGuid(),
      Name = "Test Merchant",
      Category = MerchantCategory.SUPERMARKET,
      ParentCompanyId = Guid.NewGuid()
    };

    // Assert
    Assert.NotNull(merchant);
    Assert.NotEqual(Guid.Empty, merchant.id);
    Assert.Equal("Test Merchant", merchant.Name);
    Assert.Equal(MerchantCategory.SUPERMARKET, merchant.Category);
  }

  /// <summary>
  /// Verifies Merchant default category is OTHER.
  /// </summary>
  [Fact]
  public void Merchant_DefaultCategory_IsOther()
  {
    // Arrange
    var merchant = new Merchant();

    // Assert
    Assert.Equal(MerchantCategory.OTHER, merchant.Category);
  }

  /// <summary>
  /// Verifies Merchant has default empty Address.
  /// </summary>
  [Fact]
  public void Merchant_DefaultAddress_IsEmpty()
  {
    // Arrange
    var merchant = new Merchant();

    // Assert
    Assert.NotNull(merchant.Address);
    Assert.Equal(string.Empty, merchant.Address.FullName);
  }

  /// <summary>
  /// Verifies Merchant has default empty ReferencedInvoices.
  /// </summary>
  [Fact]
  public void Merchant_DefaultReferencedInvoices_IsEmpty()
  {
    // Arrange
    var merchant = new Merchant();

    // Assert
    Assert.NotNull(merchant.ReferencedInvoices);
    Assert.Empty(merchant.ReferencedInvoices);
  }

  /// <summary>
  /// Verifies Merchant has default empty AdditionalMetadata.
  /// </summary>
  [Fact]
  public void Merchant_DefaultAdditionalMetadata_IsEmpty()
  {
    // Arrange
    var merchant = new Merchant();

    // Assert
    Assert.NotNull(merchant.AdditionalMetadata);
    Assert.Empty(merchant.AdditionalMetadata);
  }

  /// <summary>
  /// Verifies Merchant Address can be set.
  /// </summary>
  [Fact]
  public void Merchant_SetAddress_AddressIsSet()
  {
    // Arrange
    var merchant = new Merchant
    {
      Address = new ContactInformation
      {
        FullName = "Test Store",
        Address = "123 Main St",
        PhoneNumber = "+1234567890"
      }
    };

    // Assert
    Assert.Equal("Test Store", merchant.Address.FullName);
    Assert.Equal("123 Main St", merchant.Address.Address);
    Assert.Equal("+1234567890", merchant.Address.PhoneNumber);
  }

  /// <summary>
  /// Verifies MerchantCategory can be set on Merchant.
  /// </summary>
  [Theory]
  [InlineData(MerchantCategory.NOT_DEFINED)]
  [InlineData(MerchantCategory.LOCAL_SHOP)]
  [InlineData(MerchantCategory.SUPERMARKET)]
  [InlineData(MerchantCategory.HYPERMARKET)]
  [InlineData(MerchantCategory.ONLINE_SHOP)]
  [InlineData(MerchantCategory.OTHER)]
  public void MerchantCategory_CanBeSetOnMerchant(MerchantCategory category)
  {
    // Arrange
    var merchant = new Merchant { Category = category };

    // Assert
    Assert.Equal(category, merchant.Category);
  }

  /// <summary>
  /// Verifies Merchant ParentCompanyId can be set.
  /// </summary>
  [Fact]
  public void Merchant_SetParentCompanyId_ParentCompanyIdIsSet()
  {
    // Arrange
    var parentId = Guid.NewGuid();
    var merchant = new Merchant
    {
      ParentCompanyId = parentId
    };

    // Assert
    Assert.Equal(parentId, merchant.ParentCompanyId);
  }

  /// <summary>
  /// Verifies Merchant default ParentCompanyId is empty GUID.
  /// </summary>
  [Fact]
  public void Merchant_DefaultParentCompanyId_IsEmptyGuid()
  {
    // Arrange
    var merchant = new Merchant();

    // Assert
    Assert.Equal(Guid.Empty, merchant.ParentCompanyId);
  }

  #endregion

  #region InvoiceScan Tests

  /// <summary>
  /// Verifies InvoiceScan.Default() creates instance with UNKNOWN type.
  /// </summary>
  [Fact]
  public void InvoiceScan_Default_SetsTypeToUnknown()
  {
    // Act
    var scan = InvoiceScan.Default();

    // Assert
    Assert.Equal(ScanType.UNKNOWN, scan.Type);
  }

  /// <summary>
  /// Verifies InvoiceScan.Default() sets location to default URI.
  /// </summary>
  [Fact]
  public void InvoiceScan_Default_SetsDefaultLocation()
  {
    // Act
    var scan = InvoiceScan.Default();

    // Assert
    Assert.Equal("https://arolariu.ro/", scan.Location.ToString());
  }

  /// <summary>
  /// Verifies InvoiceScan.Default() creates empty metadata.
  /// </summary>
  [Fact]
  public void InvoiceScan_Default_CreatesEmptyMetadata()
  {
    // Act
    var scan = InvoiceScan.Default();

    // Assert
    Assert.NotNull(scan.Metadata);
    Assert.Empty(scan.Metadata);
  }

  /// <summary>
  /// Verifies InvoiceScan.NotDefault() returns false for default scan.
  /// </summary>
  [Fact]
  public void InvoiceScan_NotDefault_DefaultScan_ReturnsFalse()
  {
    // Arrange
    var scan = InvoiceScan.Default();

    // Act
    var result = InvoiceScan.NotDefault(scan);

    // Assert
    Assert.False(result);
  }

  /// <summary>
  /// Verifies InvoiceScan.NotDefault() returns true for valid scan.
  /// </summary>
  [Fact]
  public void InvoiceScan_NotDefault_ValidScan_ReturnsTrue()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.PNG, new Uri("https://example.com/scan.png"), null);

    // Act
    var result = InvoiceScan.NotDefault(scan);

    // Assert
    Assert.True(result);
  }

  /// <summary>
  /// Verifies InvoiceScan.NotDefault() returns false when type is UNKNOWN.
  /// </summary>
  [Fact]
  public void InvoiceScan_NotDefault_UnknownType_ReturnsFalse()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.UNKNOWN, new Uri("https://example.com/scan.png"), null);

    // Act
    var result = InvoiceScan.NotDefault(scan);

    // Assert
    Assert.False(result);
  }

  /// <summary>
  /// Verifies InvoiceScan.NotDefault() returns false when location is default.
  /// </summary>
  [Fact]
  public void InvoiceScan_NotDefault_DefaultLocation_ReturnsFalse()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.PNG, new Uri("https://arolariu.ro"), null);

    // Act
    var result = InvoiceScan.NotDefault(scan);

    // Assert
    Assert.False(result);
  }

  /// <summary>
  /// Verifies InvoiceScan can be created with all parameters.
  /// </summary>
  [Fact]
  public void InvoiceScan_ParameterizedConstructor_SetsAllProperties()
  {
    // Arrange
    var type = ScanType.JPG;
    var location = new Uri("https://example.com/invoice.jpg");
    var metadata = new Dictionary<string, object> { { "source", "mobile" } };

    // Act
    var scan = new InvoiceScan(type, location, metadata);

    // Assert
    Assert.Equal(ScanType.JPG, scan.Type);
    Assert.Equal("https://example.com/invoice.jpg", scan.Location.ToString());
    Assert.Equal("mobile", scan.Metadata!["source"]);
  }

  /// <summary>
  /// Verifies InvoiceScan equality based on value.
  /// </summary>
  [Fact]
  public void InvoiceScan_SameValues_AreEqual()
  {
    // Arrange
    var scan1 = new InvoiceScan(ScanType.PDF, new Uri("https://example.com/doc.pdf"), null);
    var scan2 = new InvoiceScan(ScanType.PDF, new Uri("https://example.com/doc.pdf"), null);

    // Assert
    Assert.Equal(scan1, scan2);
  }

  /// <summary>
  /// Verifies InvoiceScan inequality for different values.
  /// </summary>
  [Fact]
  public void InvoiceScan_DifferentValues_AreNotEqual()
  {
    // Arrange
    var scan1 = new InvoiceScan(ScanType.PDF, new Uri("https://example.com/doc1.pdf"), null);
    var scan2 = new InvoiceScan(ScanType.PDF, new Uri("https://example.com/doc2.pdf"), null);

    // Assert
    Assert.NotEqual(scan1, scan2);
  }

  /// <summary>
  /// Verifies InvoiceScan has Serializable attribute.
  /// </summary>
  [Fact]
  public void InvoiceScan_HasSerializableAttribute()
  {
    // Assert
    Assert.True(Attribute.IsDefined(typeof(InvoiceScan), typeof(SerializableAttribute)));
  }

  #endregion

  #region ScanType Enum Tests

  /// <summary>
  /// Verifies ScanType enum has expected values.
  /// </summary>
  [Theory]
  [InlineData(ScanType.JPG)]
  [InlineData(ScanType.JPEG)]
  [InlineData(ScanType.PNG)]
  [InlineData(ScanType.PDF)]
  [InlineData(ScanType.OTHER)]
  [InlineData(ScanType.UNKNOWN)]
  public void ScanType_AllValues_AreDefined(ScanType scanType)
  {
    // Assert
    Assert.True(Enum.IsDefined<ScanType>(scanType));
  }

  /// <summary>
  /// Verifies ScanType can be parsed from string.
  /// </summary>
  [Theory]
  [InlineData("JPG")]
  [InlineData("JPEG")]
  [InlineData("PNG")]
  [InlineData("PDF")]
  [InlineData("OTHER")]
  [InlineData("UNKNOWN")]
  public void ScanType_ParseFromString_ReturnsCorrectValue(string scanTypeName)
  {
    // Act
    var parsed = Enum.Parse<ScanType>(scanTypeName);

    // Assert
    Assert.True(Enum.IsDefined<ScanType>(parsed));
  }

  #endregion

  #region InvoiceCategory Enum Tests

  /// <summary>
  /// Verifies InvoiceCategory enum has NOT_DEFINED as valid value.
  /// </summary>
  [Fact]
  public void InvoiceCategory_NotDefined_IsDefined()
  {
    // Assert
    Assert.True(Enum.IsDefined<InvoiceCategory>(InvoiceCategory.NOT_DEFINED));
  }

  /// <summary>
  /// Verifies InvoiceCategory has multiple category options.
  /// </summary>
  [Theory]
  [InlineData(InvoiceCategory.NOT_DEFINED)]
  [InlineData(InvoiceCategory.GROCERY)]
  [InlineData(InvoiceCategory.FAST_FOOD)]
  [InlineData(InvoiceCategory.HOME_CLEANING)]
  [InlineData(InvoiceCategory.CAR_AUTO)]
  [InlineData(InvoiceCategory.OTHER)]
  public void InvoiceCategory_AllValues_AreDefined(InvoiceCategory category)
  {
    // Assert
    Assert.True(Enum.IsDefined<InvoiceCategory>(category));
  }

  #endregion

  #region MerchantCategory Enum Tests

  /// <summary>
  /// Verifies MerchantCategory enum has OTHER as valid value.
  /// </summary>
  [Fact]
  public void MerchantCategory_Other_IsDefined()
  {
    // Assert
    Assert.True(Enum.IsDefined<MerchantCategory>(MerchantCategory.OTHER));
  }

  /// <summary>
  /// Verifies MerchantCategory has multiple category options.
  /// </summary>
  [Theory]
  [InlineData(MerchantCategory.NOT_DEFINED)]
  [InlineData(MerchantCategory.LOCAL_SHOP)]
  [InlineData(MerchantCategory.SUPERMARKET)]
  [InlineData(MerchantCategory.HYPERMARKET)]
  [InlineData(MerchantCategory.ONLINE_SHOP)]
  [InlineData(MerchantCategory.OTHER)]
  public void MerchantCategory_AllValues_AreDefined(MerchantCategory category)
  {
    // Assert
    Assert.True(Enum.IsDefined<MerchantCategory>(category));
  }

  #endregion
}
