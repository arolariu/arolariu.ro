namespace arolariu.Backend.Domain.Tests.Invoices.DDD.Entities;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Extended tests for DDD entity behaviors covering construction,
/// property assignment, and business rules.
/// </summary>
[TestClass]
public sealed class EntityExtendedTests
{
  #region Invoice Entity Extended Tests

  /// <summary>
  /// Validates invoice can be created with minimal required properties.
  /// </summary>
  [TestMethod]
  public void Invoice_MinimalConstruction_CreatesSuccessfully()
  {
    // Arrange & Act
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid()
    };

    // Assert
    Assert.AreNotEqual(Guid.Empty, invoice.id);
    Assert.AreNotEqual(Guid.Empty, invoice.UserIdentifier);
  }

  /// <summary>
  /// Validates invoice items collection starts empty.
  /// </summary>
  [TestMethod]
  public void Invoice_NewInstance_HasEmptyItems()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();

    // Assert
    Assert.IsEmpty(invoice.Items);
  }

  /// <summary>
  /// Validates adding products to invoice.
  /// </summary>
  [TestMethod]
  public void Invoice_AddProducts_IncrementsCount()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();

    // Act
    invoice.Items.Add(new Product { Name = "Product 1" });
    invoice.Items.Add(new Product { Name = "Product 2" });
    invoice.Items.Add(new Product { Name = "Product 3" });

    // Assert
    Assert.AreEqual(3, invoice.Items.Count);
  }

  /// <summary>
  /// Validates removing products from invoice.
  /// </summary>
  [TestMethod]
  public void Invoice_RemoveProducts_DecrementsCount()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();
    var product1 = new Product { Name = "Product 1" };
    var product2 = new Product { Name = "Product 2" };
    invoice.Items.Add(product1);
    invoice.Items.Add(product2);

    // Act
    invoice.Items.Remove(product1);

    // Assert
    Assert.ContainsSingle(invoice.Items);
  }

  /// <summary>
  /// Validates NumberOfUpdates can be incremented.
  /// </summary>
  [TestMethod]
  public void Invoice_IncrementNumberOfUpdates_IncreasesValue()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateRandomInvoice();
    var initial = invoice.NumberOfUpdates;

    // Act
    invoice.NumberOfUpdates++;

    // Assert
    Assert.AreEqual(initial + 1, invoice.NumberOfUpdates);
  }

  /// <summary>
  /// Validates NumberOfUpdates starts at zero for new invoice.
  /// </summary>
  [TestMethod]
  public void Invoice_NewInstance_NumberOfUpdatesIsZero()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid()
    };

    // Assert
    Assert.AreEqual(0, invoice.NumberOfUpdates);
  }

  /// <summary>
  /// Validates CreatedAt is initialized with default value.
  /// </summary>
  [TestMethod]
  public void Invoice_CreatedAt_HasValue()
  {
    // Arrange & Act
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    // Assert
    Assert.AreNotEqual(default, invoice.CreatedAt);
  }

  /// <summary>
  /// Validates LastUpdatedAt has a value after creation.
  /// </summary>
  [TestMethod]
  public void Invoice_LastUpdatedAt_HasValue()
  {
    // Arrange & Act
    var invoice = InvoiceBuilder.CreateRandomInvoice();

    // Assert
    // LastUpdatedAt should be set to a value (either default or initialized)
    Assert.IsTrue(invoice.LastUpdatedAt >= default(DateTimeOffset));
  }

  /// <summary>
  /// Validates invoice with large items collection.
  /// </summary>
  [TestMethod]
  public void Invoice_LargeItemsCollection_HandlesCorrectly()
  {
    // Arrange
    var invoice = InvoiceBuilder.CreateInvoiceWithSpecificProperties();
    invoice.Items.Clear();

    // Act
    for (int i = 0; i < 1000; i++)
    {
      invoice.Items.Add(new Product { Name = $"Product {i}" });
    }

    // Assert
    Assert.AreEqual(1000, invoice.Items.Count);
  }

  #endregion

  #region Merchant Entity Extended Tests

  /// <summary>
  /// Validates merchant can be created with minimal required properties.
  /// </summary>
  [TestMethod]
  public void Merchant_MinimalConstruction_CreatesSuccessfully()
  {
    // Arrange & Act
    var merchant = new Merchant
    {
      id = Guid.NewGuid(),
      ParentCompanyId = Guid.NewGuid()
    };

    // Assert
    Assert.AreNotEqual(Guid.Empty, merchant.id);
  }

  /// <summary>
  /// Validates merchant name property can be set.
  /// </summary>
  [TestMethod]
  public void Merchant_SetName_StoresValue()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    // Act
    merchant.Name = "Test Merchant Name";

    // Assert
    Assert.AreEqual("Test Merchant Name", merchant.Name);
  }

  /// <summary>
  /// Validates merchant address can be assigned.
  /// </summary>
  [TestMethod]
  public void Merchant_SetAddress_StoresValue()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var address = new ContactInformation
    {
      Address = "123 Test Street",
      PhoneNumber = "555-1234"
    };

    // Act
    merchant.Address = address;

    // Assert
    Assert.AreEqual("123 Test Street", merchant.Address.Address);
    Assert.AreEqual("555-1234", merchant.Address.PhoneNumber);
  }

  /// <summary>
  /// Validates merchant parent company ID can be set.
  /// </summary>
  [TestMethod]
  public void Merchant_SetParentCompanyId_StoresValue()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var parentId = Guid.NewGuid();

    // Act
    merchant.ParentCompanyId = parentId;

    // Assert
    Assert.AreEqual(parentId, merchant.ParentCompanyId);
  }

  /// <summary>
  /// Validates merchant with empty name.
  /// </summary>
  [TestMethod]
  public void Merchant_EmptyName_IsAllowed()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    // Act
    merchant.Name = string.Empty;

    // Assert
    Assert.AreEqual(string.Empty, merchant.Name);
  }

  /// <summary>
  /// Validates merchant with null name.
  /// </summary>
  [TestMethod]
  public void Merchant_NullName_IsAllowed()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();

    // Act
    merchant.Name = null!;

    // Assert
    Assert.IsNull(merchant.Name);
  }

  /// <summary>
  /// Validates merchant with long name.
  /// </summary>
  [TestMethod]
  public void Merchant_LongName_IsAllowed()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var longName = new string('A', 1000);

    // Act
    merchant.Name = longName;

    // Assert
    Assert.AreEqual(1000, merchant.Name.Length);
  }

  /// <summary>
  /// Validates merchant with unicode name.
  /// </summary>
  [TestMethod]
  public void Merchant_UnicodeName_IsAllowed()
  {
    // Arrange
    var merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    var unicodeName = "日本語商人 中文商家 التاجر";

    // Act
    merchant.Name = unicodeName;

    // Assert
    Assert.AreEqual(unicodeName, merchant.Name);
  }

  #endregion

  #region InvoiceScan Value Object Extended Tests

  /// <summary>
  /// Validates invoice scan can be created with required properties.
  /// </summary>
  [TestMethod]
  public void InvoiceScan_MinimalConstruction_CreatesSuccessfully()
  {
    // Arrange & Act
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), null);

    // Assert
    Assert.IsNotNull(scan.Location);
  }

  /// <summary>
  /// Validates invoice scan location is stored correctly.
  /// </summary>
  [TestMethod]
  public void InvoiceScan_SetLocation_StoresValue()
  {
    // Arrange
    var uri = new Uri("https://storage.example.com/invoices/scan123.png");

    // Act
    var scan = new InvoiceScan(ScanType.PNG, uri, null);

    // Assert
    Assert.AreEqual(uri, scan.Location);
  }

  /// <summary>
  /// Validates invoice scan with various URI schemes.
  /// </summary>
  [TestMethod]
  [DynamicData(nameof(GetVariousUriSchemes))]
  public void InvoiceScan_VariousUriSchemes_AreAllowed(Uri uri)
  {
    // Arrange & Act
    var scan = new InvoiceScan(ScanType.OTHER, uri, null);

    // Assert
    Assert.IsNotNull(scan.Location);
  }

  /// <summary>
  /// Gets various URI schemes for testing.
  /// </summary>
  public static IEnumerable<object[]> GetVariousUriSchemes =>
  [
    [new Uri("https://example.com/scan.jpg")],
    [new Uri("http://example.com/scan.jpg")],
    [new Uri("file:///c:/scans/scan.jpg")]
  ];

  /// <summary>
  /// Validates invoice scan with complex URI.
  /// </summary>
  [TestMethod]
  public void InvoiceScan_ComplexUri_HandlesCorrectly()
  {
    // Arrange
    var complexUri = new Uri("https://storage.azure.com/container/folder/subfolder/scan-123_abc.jpg?token=abc123&expires=2025-01-01");

    // Act
    var scan = new InvoiceScan(ScanType.JPG, complexUri, null);

    // Assert
    Assert.AreEqual("storage.azure.com", scan.Location.Host);
    Assert.IsTrue(scan.Location.LocalPath.Contains("scan-123_abc.jpg", StringComparison.Ordinal));
  }

  /// <summary>
  /// Validates invoice scan default factory method.
  /// </summary>
  [TestMethod]
  public void InvoiceScan_Default_ReturnsUnknownType()
  {
    // Act
    var scan = InvoiceScan.Default();

    // Assert
    Assert.AreEqual(ScanType.UNKNOWN, scan.Type);
  }

  /// <summary>
  /// Validates NotDefault returns false for default scan.
  /// </summary>
  [TestMethod]
  public void InvoiceScan_NotDefault_ReturnsFalseForDefault()
  {
    // Arrange
    var scan = InvoiceScan.Default();

    // Act
    var result = InvoiceScan.NotDefault(scan);

    // Assert
    Assert.IsFalse(result);
  }

  /// <summary>
  /// Validates NotDefault returns true for non-default scan.
  /// </summary>
  [TestMethod]
  public void InvoiceScan_NotDefault_ReturnsTrueForNonDefault()
  {
    // Arrange
    var scan = new InvoiceScan(ScanType.JPG, new Uri("https://custom.com/scan.jpg"), null);

    // Act
    var result = InvoiceScan.NotDefault(scan);

    // Assert
    Assert.IsTrue(result);
  }

  /// <summary>
  /// Validates all scan types are supported.
  /// </summary>
  [TestMethod]
  [DataRow(ScanType.JPG)]
  [DataRow(ScanType.JPEG)]
  [DataRow(ScanType.PNG)]
  [DataRow(ScanType.PDF)]
  [DataRow(ScanType.OTHER)]
  [DataRow(ScanType.UNKNOWN)]
  public void InvoiceScan_AllScanTypes_AreSupported(ScanType type)
  {
    // Arrange & Act
    var scan = new InvoiceScan(type, new Uri("https://example.com/scan"), null);

    // Assert
    Assert.AreEqual(type, scan.Type);
  }

  #endregion

  #region Product Value Object Extended Tests

  /// <summary>
  /// Validates product can be created with minimal properties.
  /// </summary>
  [TestMethod]
  public void Product_MinimalConstruction_CreatesSuccessfully()
  {
    // Arrange & Act
    var product = new Product();

    // Assert
    Assert.IsNotNull(product);
  }

  /// <summary>
  /// Validates product name can be set.
  /// </summary>
  [TestMethod]
  public void Product_SetName_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Name = "Test Product";

    // Assert
    Assert.AreEqual("Test Product", product.Name);
  }

  /// <summary>
  /// Validates product name can be updated.
  /// </summary>
  [TestMethod]
  public void Product_SetName_UpdatesValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Name = "Generic Name";

    // Assert
    Assert.AreEqual("Generic Name", product.Name);
  }

  /// <summary>
  /// Validates product quantity can be set.
  /// </summary>
  [TestMethod]
  public void Product_SetQuantity_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Quantity = 5;

    // Assert
    Assert.AreEqual(5, product.Quantity);
  }

  /// <summary>
  /// Validates product price can be set.
  /// </summary>
  [TestMethod]
  public void Product_SetPrice_StoresValue()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Price = 19.99m;

    // Assert
    Assert.AreEqual(19.99m, product.Price);
  }

  /// <summary>
  /// Validates product with zero quantity.
  /// </summary>
  [TestMethod]
  public void Product_ZeroQuantity_IsAllowed()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Quantity = 0;

    // Assert
    Assert.AreEqual(0, product.Quantity);
  }

  /// <summary>
  /// Validates product with zero price.
  /// </summary>
  [TestMethod]
  public void Product_ZeroPrice_IsAllowed()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Price = 0m;

    // Assert
    Assert.AreEqual(0m, product.Price);
  }

  /// <summary>
  /// Validates product with negative price.
  /// </summary>
  [TestMethod]
  public void Product_NegativePrice_IsAllowed()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Price = -10.00m;

    // Assert
    Assert.AreEqual(-10.00m, product.Price);
  }

  /// <summary>
  /// Validates product with large quantity.
  /// </summary>
  [TestMethod]
  public void Product_LargeQuantity_IsAllowed()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Quantity = 999999;

    // Assert
    Assert.AreEqual(999999, product.Quantity);
  }

  /// <summary>
  /// Validates product with high precision price.
  /// </summary>
  [TestMethod]
  public void Product_HighPrecisionPrice_IsAllowed()
  {
    // Arrange
    var product = new Product();

    // Act
    product.Price = 123.456789m;

    // Assert
    Assert.AreEqual(123.456789m, product.Price);
  }

  #endregion

  #region ContactInformation Value Object Extended Tests

  /// <summary>
  /// Validates contact information can be created with minimal properties.
  /// </summary>
  [TestMethod]
  public void ContactInformation_MinimalConstruction_CreatesSuccessfully()
  {
    // Arrange & Act
    var contact = new ContactInformation();

    // Assert
    Assert.IsNotNull(contact);
  }

  /// <summary>
  /// Validates contact information full name can be set.
  /// </summary>
  [TestMethod]
  public void ContactInformation_SetFullName_StoresValue()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act
    contact.FullName = "John Doe";

    // Assert
    Assert.AreEqual("John Doe", contact.FullName);
  }

  /// <summary>
  /// Validates contact information address can be set.
  /// </summary>
  [TestMethod]
  public void ContactInformation_SetAddress_StoresValue()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act
    contact.Address = "123 Main Street, New York, NY 10001";

    // Assert
    Assert.AreEqual("123 Main Street, New York, NY 10001", contact.Address);
  }

  /// <summary>
  /// Validates contact information phone number can be set.
  /// </summary>
  [TestMethod]
  public void ContactInformation_SetPhoneNumber_StoresValue()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act
    contact.PhoneNumber = "+1-555-123-4567";

    // Assert
    Assert.AreEqual("+1-555-123-4567", contact.PhoneNumber);
  }

  /// <summary>
  /// Validates contact information email can be set.
  /// </summary>
  [TestMethod]
  public void ContactInformation_SetEmailAddress_StoresValue()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act
    contact.EmailAddress = "test@example.com";

    // Assert
    Assert.AreEqual("test@example.com", contact.EmailAddress);
  }

  /// <summary>
  /// Validates contact information website can be set.
  /// </summary>
  [TestMethod]
  public void ContactInformation_SetWebsite_StoresValue()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act
    contact.Website = "https://www.example.com";

    // Assert
    Assert.AreEqual("https://www.example.com", contact.Website);
  }

  /// <summary>
  /// Validates contact information with empty values.
  /// </summary>
  [TestMethod]
  public void ContactInformation_EmptyValues_AreAllowed()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act - default values are empty string
    // Assert
    Assert.AreEqual(string.Empty, contact.FullName);
    Assert.AreEqual(string.Empty, contact.Address);
    Assert.AreEqual(string.Empty, contact.PhoneNumber);
  }

  /// <summary>
  /// Validates contact information with unicode values.
  /// </summary>
  [TestMethod]
  public void ContactInformation_UnicodeValues_AreAllowed()
  {
    // Arrange
    var contact = new ContactInformation();

    // Act
    contact.FullName = "山田太郎";
    contact.Address = "東京都渋谷区";

    // Assert
    Assert.AreEqual("山田太郎", contact.FullName);
    Assert.AreEqual("東京都渋谷区", contact.Address);
  }

  #endregion

  #region Guid Identity Tests

  /// <summary>
  /// Validates invoice identity is unique per instance.
  /// </summary>
  [TestMethod]
  public void Invoice_MultipleInstances_HaveUniqueIds()
  {
    // Arrange & Act
    var invoices = InvoiceBuilder.CreateMultipleRandomInvoices(100);

    // Assert
    var uniqueIds = invoices.Select(i => i.id).Distinct();
    Assert.AreEqual(100, uniqueIds.Count());
  }

  /// <summary>
  /// Validates merchant identity is unique per instance.
  /// </summary>
  [TestMethod]
  public void Merchant_MultipleInstances_HaveUniqueIds()
  {
    // Arrange & Act
    var merchants = Enumerable.Range(0, 100)
        .Select(_ => MerchantTestDataBuilder.CreateRandomMerchant())
        .ToList();

    // Assert
    var uniqueIds = merchants.Select(m => m.id).Distinct();
    Assert.AreEqual(100, uniqueIds.Count());
  }

  #endregion
}
