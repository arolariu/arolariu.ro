namespace arolariu.Backend.Domain.Tests.Invoices.DDD.EdgeCases;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Tests.Builders;

using Xunit;

/// <summary>
/// Edge case tests for Invoice and related DDD entities.
/// These tests focus on boundary conditions, null handling, and unusual scenarios.
/// Method naming follows MethodName_Condition_ExpectedResult pattern per repository standards.
/// </summary>
public sealed class InvoiceEdgeCaseTests
{
	#region Invoice Boundary Tests

	/// <summary>
	/// Verifies Invoice handles maximum items count.
	/// </summary>
	[Fact]
	public void Invoice_MaximumItemsCount_HandlesCorrectly()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			Items = new List<Product>(Enumerable.Range(0, 1000).Select(i => new Product { RawName = $"Product {i}", Price = i }))
		};

		// Assert
		Assert.Equal(1000, invoice.Items.Count);
	}

	/// <summary>
	/// Verifies Invoice handles empty name.
	/// </summary>
	[Fact]
	public void Invoice_EmptyName_IsAllowed()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			Name = string.Empty
		};

		// Assert
		Assert.Equal(string.Empty, invoice.Name);
	}

	/// <summary>
	/// Verifies Invoice handles whitespace name.
	/// </summary>
	[Fact]
	public void Invoice_WhitespaceName_IsAllowed()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			Name = "   "
		};

		// Assert
		Assert.Equal("   ", invoice.Name);
	}

	/// <summary>
	/// Verifies Invoice handles very long name.
	/// </summary>
	[Fact]
	public void Invoice_VeryLongName_IsAllowed()
	{
		// Arrange
		var longName = new string('A', 10000);
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			Name = longName
		};

		// Assert
		Assert.Equal(10000, invoice.Name.Length);
	}

	/// <summary>
	/// Verifies Invoice handles special characters in name.
	/// </summary>
	[Fact]
	public void Invoice_SpecialCharactersInName_AreAllowed()
	{
		// Arrange
		var specialName = "Test @#$%^&*() 日本語 emoji 😀";
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			Name = specialName
		};

		// Assert
		Assert.Equal(specialName, invoice.Name);
	}

	/// <summary>
	/// Verifies Invoice handles maximum shared users.
	/// </summary>
	[Fact]
	public void Invoice_MaximumSharedUsers_HandlesCorrectly()
	{
		// Arrange
		var sharedUsers = Enumerable.Range(0, 100).Select(_ => Guid.NewGuid()).ToList();
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			SharedWith = sharedUsers
		};

		// Assert
		Assert.Equal(100, invoice.SharedWith.Count);
	}

	/// <summary>
	/// Verifies Invoice handles duplicate shared users.
	/// </summary>
	[Fact]
	public void Invoice_DuplicateSharedUsers_AreAllowed()
	{
		// Arrange
		var sharedUserId = Guid.NewGuid();
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			SharedWith = new List<Guid> { sharedUserId, sharedUserId, sharedUserId }
		};

		// Assert
		Assert.Equal(3, invoice.SharedWith.Count);
	}

	/// <summary>
	/// Verifies Invoice handles empty GUID for shared user.
	/// </summary>
	[Fact]
	public void Invoice_EmptyGuidSharedUser_IsAllowed()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			SharedWith = new List<Guid> { Guid.Empty }
		};

		// Assert
		Assert.Single(invoice.SharedWith);
		Assert.Contains(Guid.Empty, invoice.SharedWith);
	}

	/// <summary>
	/// Verifies Invoice PerformUpdate with same user ID multiple times.
	/// </summary>
	[Fact]
	public void Invoice_PerformUpdate_SameUserId_MultipleUpdates_IncrementsCorrectly()
	{
		// Arrange
		var invoice = InvoiceBuilder.CreateRandomInvoice();
		var userId = Guid.NewGuid();
		var initialCount = invoice.NumberOfUpdates;

		// Act
		for (int i = 0; i < 10; i++)
		{
			invoice.PerformUpdate(userId);
		}

		// Assert
		Assert.Equal(initialCount + 10, invoice.NumberOfUpdates);
		Assert.Equal(userId, invoice.LastUpdatedBy);
	}

	/// <summary>
	/// Verifies Invoice handles null description.
	/// </summary>
	[Fact]
	public void Invoice_NullDescription_IsAllowed()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			Description = null
		};

		// Assert
		Assert.Null(invoice.Description);
	}

	#endregion

	#region Product Edge Cases

	/// <summary>
	/// Verifies Product handles zero price.
	/// </summary>
	[Fact]
	public void Product_ZeroPrice_IsValid()
	{
		// Arrange
		var product = new Product
		{
			RawName = "Free Item",
			Price = 0,
			Quantity = 1
		};

		// Assert
		Assert.Equal(0, product.Price);
		Assert.Equal(0, product.TotalPrice);
	}

	/// <summary>
	/// Verifies Product handles negative price.
	/// </summary>
	[Fact]
	public void Product_NegativePrice_IsAllowed()
	{
		// Arrange
		var product = new Product
		{
			RawName = "Discount Item",
			Price = -10.00m,
			Quantity = 1
		};

		// Assert
		Assert.Equal(-10.00m, product.Price);
		Assert.Equal(-10.00m, product.TotalPrice);
	}

	/// <summary>
	/// Verifies Product handles very large price.
	/// </summary>
	[Fact]
	public void Product_VeryLargePrice_IsAllowed()
	{
		// Arrange
		var product = new Product
		{
			RawName = "Expensive Item",
			Price = 999999999.99m,
			Quantity = 1
		};

		// Assert
		Assert.Equal(999999999.99m, product.Price);
	}

	/// <summary>
	/// Verifies Product handles fractional quantity.
	/// </summary>
	[Fact]
	public void Product_FractionalQuantity_CalculatesTotalCorrectly()
	{
		// Arrange
		var product = new Product
		{
			RawName = "Bulk Item",
			Price = 10.00m,
			Quantity = 0.5m
		};

		// Assert
		Assert.Equal(5.00m, product.TotalPrice);
	}

	/// <summary>
	/// Verifies Product handles maximum decimal precision.
	/// </summary>
	[Fact]
	public void Product_MaxDecimalPrecision_HandlesCorrectly()
	{
		// Arrange
		var product = new Product
		{
			RawName = "Precision Item",
			Price = 0.0000000001m,
			Quantity = 1
		};

		// Assert
		Assert.Equal(0.0000000001m, product.TotalPrice);
	}

	/// <summary>
	/// Verifies Product handles empty raw name.
	/// </summary>
	[Fact]
	public void Product_EmptyRawName_IsAllowed()
	{
		// Arrange
		var product = new Product
		{
			RawName = string.Empty
		};

		// Assert
		Assert.Equal(string.Empty, product.RawName);
	}

	/// <summary>
	/// Verifies Product handles very long product code.
	/// </summary>
	[Fact]
	public void Product_VeryLongProductCode_IsAllowed()
	{
		// Arrange
		var longCode = new string('X', 1000);
		var product = new Product
		{
			ProductCode = longCode
		};

		// Assert
		Assert.Equal(1000, product.ProductCode.Length);
	}

	/// <summary>
	/// Verifies Product handles multiple allergens.
	/// </summary>
	[Fact]
	public void Product_MultipleAllergens_HandlesCorrectly()
	{
		// Arrange
		var allergens = new List<Allergen>
		{
			new Allergen { Name = "Gluten" },
			new Allergen { Name = "Dairy" },
			new Allergen { Name = "Nuts" },
			new Allergen { Name = "Soy" },
			new Allergen { Name = "Eggs" }
		};
		var product = new Product
		{
			DetectedAllergens = allergens
		};

		// Assert
		Assert.Equal(5, product.DetectedAllergens.Count());
	}

	#endregion

	#region PaymentInformation Edge Cases

	/// <summary>
	/// Verifies PaymentInformation handles zero total cost.
	/// </summary>
	[Fact]
	public void PaymentInformation_ZeroTotalCost_IsValid()
	{
		// Arrange
		var payment = new PaymentInformation
		{
			TotalCostAmount = 0,
			TotalTaxAmount = 0
		};

		// Assert
		Assert.Equal(0, payment.TotalCostAmount);
		Assert.Equal(0, payment.TotalTaxAmount);
	}

	/// <summary>
	/// Verifies PaymentInformation handles negative tax.
	/// </summary>
	[Fact]
	public void PaymentInformation_NegativeTax_IsAllowed()
	{
		// Arrange
		var payment = new PaymentInformation
		{
			TotalCostAmount = 100.00m,
			TotalTaxAmount = -10.00m // Tax refund scenario
		};

		// Assert
		Assert.Equal(-10.00m, payment.TotalTaxAmount);
	}

	/// <summary>
	/// Verifies PaymentInformation handles tax greater than cost.
	/// </summary>
	[Fact]
	public void PaymentInformation_TaxGreaterThanCost_IsAllowed()
	{
		// Arrange
		var payment = new PaymentInformation
		{
			TotalCostAmount = 10.00m,
			TotalTaxAmount = 50.00m
		};

		// Assert
		Assert.True(payment.TotalTaxAmount > payment.TotalCostAmount);
	}

	/// <summary>
	/// Verifies PaymentInformation handles future transaction date.
	/// </summary>
	[Fact]
	public void PaymentInformation_FutureTransactionDate_IsAllowed()
	{
		// Arrange
		var futureDate = DateTimeOffset.UtcNow.AddYears(10);
		var payment = new PaymentInformation
		{
			TransactionDate = futureDate
		};

		// Assert
		Assert.True(payment.TransactionDate > DateTimeOffset.UtcNow);
	}

	/// <summary>
	/// Verifies PaymentInformation handles very old transaction date.
	/// </summary>
	[Fact]
	public void PaymentInformation_VeryOldTransactionDate_IsAllowed()
	{
		// Arrange
		var oldDate = new DateTimeOffset(1900, 1, 1, 0, 0, 0, TimeSpan.Zero);
		var payment = new PaymentInformation
		{
			TransactionDate = oldDate
		};

		// Assert
		Assert.Equal(1900, payment.TransactionDate.Year);
	}

	#endregion

	#region Currency Edge Cases

	/// <summary>
	/// Verifies Currency handles empty code.
	/// </summary>
	[Fact]
	public void Currency_EmptyCode_IsAllowed()
	{
		// Arrange
		var currency = new Currency("Test", string.Empty, "$");

		// Assert
		Assert.Equal(string.Empty, currency.Code);
	}

	/// <summary>
	/// Verifies Currency handles very long name.
	/// </summary>
	[Fact]
	public void Currency_VeryLongName_IsAllowed()
	{
		// Arrange
		var longName = new string('C', 1000);
		var currency = new Currency(longName, "XXX", "X");

		// Assert
		Assert.Equal(1000, currency.Name.Length);
	}

	/// <summary>
	/// Verifies Currency handles multi-character symbol.
	/// </summary>
	[Fact]
	public void Currency_MultiCharacterSymbol_IsAllowed()
	{
		// Arrange
		var currency = new Currency("Test Currency", "TST", "TST$");

		// Assert
		Assert.Equal("TST$", currency.Symbol);
	}

	/// <summary>
	/// Verifies Currency handles emoji symbol.
	/// </summary>
	[Fact]
	public void Currency_EmojiSymbol_IsAllowed()
	{
		// Arrange
		var currency = new Currency("Crypto", "CRY", "🪙");

		// Assert
		Assert.Equal("🪙", currency.Symbol);
	}

	#endregion

	#region Merchant Edge Cases

	/// <summary>
	/// Verifies Merchant handles many referenced invoices.
	/// </summary>
	[Fact]
	public void Merchant_ManyReferencedInvoices_HandlesCorrectly()
	{
		// Arrange
		var invoiceIds = Enumerable.Range(0, 500).Select(_ => Guid.NewGuid()).ToList();
		var merchant = new Merchant
		{
			ReferencedInvoices = invoiceIds
		};

		// Assert
		Assert.Equal(500, merchant.ReferencedInvoices.Count);
	}

	/// <summary>
	/// Verifies Merchant handles empty name.
	/// </summary>
	[Fact]
	public void Merchant_EmptyName_IsAllowed()
	{
		// Arrange
		var merchant = new Merchant
		{
			Name = string.Empty
		};

		// Assert
		Assert.Equal(string.Empty, merchant.Name);
	}

	/// <summary>
	/// Verifies Merchant handles very long description.
	/// </summary>
	[Fact]
	public void Merchant_VeryLongDescription_IsAllowed()
	{
		// Arrange
		var longDescription = new string('D', 50000);
		var merchant = new Merchant
		{
			Description = longDescription
		};

		// Assert
		Assert.Equal(50000, merchant.Description.Length);
	}

	/// <summary>
	/// Verifies Merchant handles complex contact information.
	/// </summary>
	[Fact]
	public void Merchant_ComplexContactInformation_HandlesCorrectly()
	{
		// Arrange
		var merchant = new Merchant
		{
			Address = new ContactInformation
			{
				FullName = "Company Ltd. (Branch 42)",
				Address = "123 Main St, Suite 456, Floor 7, Building A, Business Park",
				PhoneNumber = "+1 (234) 567-8900 ext. 123",
				EmailAddress = "very.long.email.address.with.many.dots@subdomain.company.example.com",
				Website = "https://www.very-long-domain-name-with-many-subpaths.example.com/path/to/page"
			}
		};

		// Assert
		Assert.NotNull(merchant.Address);
		Assert.Contains("Company", merchant.Address.FullName);
		Assert.Contains("ext.", merchant.Address.PhoneNumber);
	}

	#endregion

	#region Recipe Edge Cases

	/// <summary>
	/// Verifies Recipe handles negative duration.
	/// </summary>
	[Fact]
	public void Recipe_NegativeDuration_IsAllowed()
	{
		// Arrange
		var recipe = new Recipe
		{
			Name = "Instant Recipe",
			ApproximateTotalDuration = -1
		};

		// Assert
		Assert.Equal(-1, recipe.ApproximateTotalDuration);
	}

	/// <summary>
	/// Verifies Recipe handles very large duration.
	/// </summary>
	[Fact]
	public void Recipe_VeryLargeDuration_IsAllowed()
	{
		// Arrange
		var recipe = new Recipe
		{
			Name = "Slow Cooked Recipe",
			ApproximateTotalDuration = int.MaxValue
		};

		// Assert
		Assert.Equal(int.MaxValue, recipe.ApproximateTotalDuration);
	}

	/// <summary>
	/// Verifies Recipe handles empty ingredients list.
	/// </summary>
	[Fact]
	public void Recipe_EmptyIngredients_IsValid()
	{
		// Arrange
		var recipe = new Recipe
		{
			Name = "No Ingredient Recipe",
			Ingredients = new List<string>()
		};

		// Assert
		Assert.Empty(recipe.Ingredients);
	}

	/// <summary>
	/// Verifies Recipe handles many ingredients.
	/// </summary>
	[Fact]
	public void Recipe_ManyIngredients_HandlesCorrectly()
	{
		// Arrange
		var ingredients = Enumerable.Range(0, 100).Select(i => $"Ingredient {i}").ToList();
		var recipe = new Recipe
		{
			Name = "Complex Recipe",
			Ingredients = ingredients
		};

		// Assert
		Assert.Equal(100, recipe.Ingredients.Count);
	}

	#endregion

	#region InvoiceScan Edge Cases

	/// <summary>
	/// Verifies InvoiceScan handles complex URI.
	/// </summary>
	[Fact]
	public void InvoiceScan_ComplexUri_HandlesCorrectly()
	{
		// Arrange
		var complexUri = new Uri("https://storage.example.com/bucket/folder/subfolder/file.jpg?token=abc123&expires=2099");
		var scan = new InvoiceScan(ScanType.JPG, complexUri, null);

		// Assert
		Assert.Contains("token=", scan.Location.Query);
	}

	/// <summary>
	/// Verifies InvoiceScan handles file URI.
	/// </summary>
	[Fact]
	public void InvoiceScan_FileUri_HandlesCorrectly()
	{
		// Arrange
		var fileUri = new Uri("file:///C:/Documents/invoice.pdf");
		var scan = new InvoiceScan(ScanType.PDF, fileUri, null);

		// Assert
		Assert.Equal("file", scan.Location.Scheme);
	}

	/// <summary>
	/// Verifies InvoiceScan handles metadata with various types.
	/// </summary>
	[Fact]
	public void InvoiceScan_ComplexMetadata_HandlesCorrectly()
	{
		// Arrange
		var metadata = new Dictionary<string, object>
		{
			{ "stringValue", "test" },
			{ "intValue", 42 },
			{ "doubleValue", 3.14 },
			{ "boolValue", true },
			{ "dateValue", DateTime.UtcNow },
			{ "guidValue", Guid.NewGuid() },
			{ "listValue", new List<int> { 1, 2, 3 } }
		};
		var scan = new InvoiceScan(ScanType.JPG, new Uri("https://example.com/scan.jpg"), metadata);

		// Assert
		Assert.Equal(7, scan.Metadata!.Count);
		Assert.Equal("test", scan.Metadata["stringValue"]);
		Assert.Equal(42, scan.Metadata["intValue"]);
		Assert.Equal(true, scan.Metadata["boolValue"]);
	}

	#endregion

	#region Allergen Edge Cases

	/// <summary>
	/// Verifies Allergen handles special characters in name.
	/// </summary>
	[Fact]
	public void Allergen_SpecialCharactersInName_IsAllowed()
	{
		// Arrange
		var allergen = new Allergen
		{
			Name = "Gluten (wheat-derived)",
			Description = "Contains <wheat> & derivatives"
		};

		// Assert
		Assert.Contains("(", allergen.Name);
		Assert.Contains("&", allergen.Description);
	}

	/// <summary>
	/// Verifies Allergen handles international characters.
	/// </summary>
	[Fact]
	public void Allergen_InternationalCharacters_IsAllowed()
	{
		// Arrange
		var allergen = new Allergen
		{
			Name = "Nüsse und Mandeln",
			Description = "Alergeny: 日本語 中文"
		};

		// Assert
		Assert.Contains("ü", allergen.Name);
		Assert.Contains("日本語", allergen.Description);
	}

	#endregion

	#region AdditionalMetadata Edge Cases

	/// <summary>
	/// Verifies Invoice AdditionalMetadata handles nested dictionaries.
	/// </summary>
	[Fact]
	public void Invoice_NestedMetadata_HandlesCorrectly()
	{
		// Arrange
		var nestedDict = new Dictionary<string, object>
		{
			{ "level1", new Dictionary<string, object>
				{
					{ "level2", "deepValue" }
				}
			}
		};
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			AdditionalMetadata = nestedDict
		};

		// Assert
		Assert.NotNull(invoice.AdditionalMetadata["level1"]);
	}

	/// <summary>
	/// Verifies Invoice AdditionalMetadata handles null values.
	/// </summary>
	[Fact]
	public void Invoice_MetadataWithNullValue_HandlesCorrectly()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			AdditionalMetadata = new Dictionary<string, object>
			{
				{ "nullKey", null! }
			}
		};

		// Assert
		Assert.True(invoice.AdditionalMetadata.ContainsKey("nullKey"));
		Assert.Null(invoice.AdditionalMetadata["nullKey"]);
	}

	/// <summary>
	/// Verifies Invoice AdditionalMetadata handles special key names.
	/// </summary>
	[Fact]
	public void Invoice_MetadataWithSpecialKeys_HandlesCorrectly()
	{
		// Arrange
		var invoice = new Invoice
		{
			id = Guid.NewGuid(),
			UserIdentifier = Guid.NewGuid(),
			AdditionalMetadata = new Dictionary<string, object>
			{
				{ "key.with.dots", "value1" },
				{ "key-with-dashes", "value2" },
				{ "key_with_underscores", "value3" },
				{ "key with spaces", "value4" },
				{ "UPPERCASE_KEY", "value5" }
			}
		};

		// Assert
		Assert.Equal(5, invoice.AdditionalMetadata.Count);
		Assert.Equal("value1", invoice.AdditionalMetadata["key.with.dots"]);
	}

	#endregion

	#region ContactInformation Edge Cases

	/// <summary>
	/// Verifies ContactInformation handles international phone numbers.
	/// </summary>
	[Fact]
	public void ContactInformation_InternationalPhoneNumber_IsAllowed()
	{
		// Arrange
		var contact = new ContactInformation
		{
			PhoneNumber = "+40 123 456 789"
		};

		// Assert
		Assert.StartsWith("+40", contact.PhoneNumber);
	}

	/// <summary>
	/// Verifies ContactInformation handles invalid email format (no validation).
	/// </summary>
	[Fact]
	public void ContactInformation_InvalidEmailFormat_IsAllowed()
	{
		// Arrange - no validation on the model level
		var contact = new ContactInformation
		{
			EmailAddress = "not-a-valid-email"
		};

		// Assert
		Assert.Equal("not-a-valid-email", contact.EmailAddress);
	}

	/// <summary>
	/// Verifies ContactInformation handles empty website.
	/// </summary>
	[Fact]
	public void ContactInformation_EmptyWebsite_IsAllowed()
	{
		// Arrange
		var contact = new ContactInformation
		{
			Website = string.Empty
		};

		// Assert
		Assert.Equal(string.Empty, contact.Website);
	}

	#endregion

	#region ProductMetadata Edge Cases

	/// <summary>
	/// Verifies ProductMetadata all flags can be true.
	/// </summary>
	[Fact]
	public void ProductMetadata_AllFlagsTrue_IsValid()
	{
		// Arrange
		var metadata = new ProductMetadata
		{
			IsEdited = true,
			IsComplete = true,
			IsSoftDeleted = true
		};

		// Assert
		Assert.True(metadata.IsEdited);
		Assert.True(metadata.IsComplete);
		Assert.True(metadata.IsSoftDeleted);
	}

	/// <summary>
	/// Verifies ProductMetadata all flags can be false.
	/// </summary>
	[Fact]
	public void ProductMetadata_AllFlagsFalse_IsValid()
	{
		// Arrange
		var metadata = new ProductMetadata
		{
			IsEdited = false,
			IsComplete = false,
			IsSoftDeleted = false
		};

		// Assert
		Assert.False(metadata.IsEdited);
		Assert.False(metadata.IsComplete);
		Assert.False(metadata.IsSoftDeleted);
	}

	#endregion
}
