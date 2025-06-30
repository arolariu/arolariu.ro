namespace arolariu.Backend.Domain.Tests.Builders;

using System;
using System.Collections.Generic;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using Xunit;

/// <summary>
/// Test data builder for Invoice entities following "The Standard" test patterns.
/// </summary>
public static class InvoiceBuilder
{
    private static readonly Random Random = new();

    public static Invoice CreateRandomInvoice() =>
        new Invoice
        {
            id = Guid.NewGuid(),
            UserIdentifier = Guid.NewGuid(),
            Name = GetRandomString(),
            Description = GetRandomString(),
            Category = InvoiceCategory.FAST_FOOD,
            PhotoLocation = new Uri($"https://example.com/{GetRandomString()}.jpg"),
            IsImportant = Random.Next(0, 2) == 1,
            CreatedBy = Guid.NewGuid(),
            CreatedAt = GetRandomDateTimeOffset(),
            NumberOfUpdates = Random.Next(0, 10),
            MerchantReference = Guid.NewGuid(),
            SharedWith = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() },
            Items = CreateRandomProducts(),
            PossibleRecipes = new List<Recipe>(),
            PaymentInformation = CreateRandomPaymentInformation()
        };

    public static Invoice CreateInvoiceWithSpecificProperties(
        Guid? id = null,
        Guid? userIdentifier = null,
        string? name = null,
        string? description = null)
    {
        var invoice = CreateRandomInvoice();
        
        // Create new instance with modified properties since id is init-only
        return new Invoice
        {
            id = id ?? invoice.id,
            UserIdentifier = userIdentifier ?? invoice.UserIdentifier,
            Name = name ?? invoice.Name,
            Description = description ?? invoice.Description,
            Category = invoice.Category,
            PhotoLocation = invoice.PhotoLocation,
            IsImportant = invoice.IsImportant,
            CreatedBy = invoice.CreatedBy,
            CreatedAt = invoice.CreatedAt,
            NumberOfUpdates = invoice.NumberOfUpdates,
            MerchantReference = invoice.MerchantReference,
            SharedWith = invoice.SharedWith,
            Items = invoice.Items,
            PossibleRecipes = invoice.PossibleRecipes,
            PaymentInformation = invoice.PaymentInformation
        };
    }

    public static TheoryData<Invoice> GetInvoiceTheoryData() =>
        new TheoryData<Invoice>
        {
            CreateRandomInvoice(),
            CreateRandomInvoice(),
            CreateRandomInvoice()
        };

    public static List<Invoice> CreateMultipleRandomInvoices(int count = 3)
    {
        var invoices = new List<Invoice>();
        for (int i = 0; i < count; i++)
        {
            invoices.Add(CreateRandomInvoice());
        }
        return invoices;
    }

    private static List<Product> CreateRandomProducts()
    {
        var productCount = Random.Next(1, 5);
        var products = new List<Product>();
        
        for (int i = 0; i < productCount; i++)
        {
            products.Add(new Product
            {
                RawName = GetRandomString(),
                GenericName = GetRandomString(),
                Category = ProductCategory.FISH,
                Quantity = (decimal)(Random.NextDouble() * 100),
                QuantityUnit = GetRandomString(),
                ProductCode = GetRandomString(),
                Price = (decimal)(Random.NextDouble() * 1000),
                DetectedAllergens = new List<Allergen> 
                { 
                    new Allergen { Name = "Gluten", Description = "Gluten allergen" },
                    new Allergen { Name = "Dairy", Description = "Dairy allergen" }
                }
            });
        }
        
        return products;
    }

    private static PaymentInformation CreateRandomPaymentInformation() =>
        new PaymentInformation
        {
            TransactionDate = GetRandomDateTimeOffset(),
            PaymentType = PaymentType.CARD,
            Currency = new Currency() { Code = "RON", Name="Romanian Leu", Symbol="RON"},
            TotalCostAmount = (decimal)(Random.NextDouble() * 1000),
            TotalTaxAmount = (decimal)(Random.NextDouble() * 100)
        };

    private static string GetRandomString() =>
        Guid.NewGuid().ToString()[..8];

    private static DateTimeOffset GetRandomDateTimeOffset() =>
        DateTimeOffset.Now.AddDays(-Random.Next(0, 365));
}

