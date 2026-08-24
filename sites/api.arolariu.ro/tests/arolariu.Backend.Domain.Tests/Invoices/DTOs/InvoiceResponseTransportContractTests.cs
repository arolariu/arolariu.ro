namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Endpoints;
using arolariu.Backend.Domain.Invoices.Services.Management;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Verifies the public structured invoice response contract used by the Task 16 rendering surfaces.
/// </summary>
/// <remarks>
/// <para>
/// These tests intentionally assert JSON property sets rather than only CLR members. The API contract is camelCase
/// JSON, and this suite protects it from accidental domain-type leakage, legacy category reintroduction, numeric
/// analysis enums, and omission of receipt extraction values.
/// </para>
/// <para>
/// A rich aggregate is used so nested classifications, allergen signals, recipes, payment details, tax details,
/// metadata, and audit fields are all exercised in one deterministic serialization.
/// </para>
/// </remarks>
[TestClass]
public sealed class InvoiceResponseTransportContractTests
{
  private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

  /// <summary>
  /// Verifies a rich invoice serializes the complete approved camelCase response shape.
  /// </summary>
  [TestMethod]
  public void SerializeInvoiceResponse_RichStructuredInvoice_UsesExactPublicKeySetsAndEnumStrings()
  {
    // Arrange
    Invoice invoice = CreateRichInvoice();
    InvoiceResponseDto response = InvoiceResponseDto.FromInvoice(invoice);

    // Act
    using JsonDocument document = JsonDocument.Parse(JsonSerializer.Serialize(response, ApiJsonOptions));
    JsonElement root = document.RootElement;
    JsonElement classification = root.GetProperty("classification");
    JsonElement product = root.GetProperty("items")[0];
    JsonElement allergenAssessment = product.GetProperty("allergenAssessment");
    JsonElement recipe = root.GetProperty("possibleRecipes")[0];

    // Assert
    AssertPropertyNames(
      root,
      "id",
      "userIdentifier",
      "sharedWith",
      "name",
      "description",
      "classification",
      "scans",
      "paymentInformation",
      "merchantReference",
      "items",
      "possibleRecipes",
      "additionalMetadata",
      "receiptType",
      "countryRegion",
      "taxDetails",
      "payments",
      "isImportant",
      "isSoftDeleted",
      "createdAt",
      "createdBy",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "numberOfUpdates");
    Assert.IsFalse(root.TryGetProperty("category", out _), "Legacy invoice category must not be transported.");

    AssertPropertyNames(
      classification,
      "system",
      "version",
      "code",
      "officialLabel",
      "hierarchy",
      "origin",
      "confidence",
      "evidence");
    Assert.AreEqual("ECOICOP_V2", classification.GetProperty("system").GetString());
    Assert.AreEqual("Analysis", classification.GetProperty("origin").GetString());
    AssertPropertyNames(classification.GetProperty("hierarchy")[0], "level", "code", "officialLabel");
    AssertPropertyNames(classification.GetProperty("evidence")[0], "source", "value");

    AssertPropertyNames(product, "name", "classification", "quantity", "quantityUnit", "productCode", "price", "totalPrice", "allergenAssessment", "metadata");
    Assert.IsFalse(product.TryGetProperty("category", out _), "Legacy product category must not be transported.");
    Assert.IsFalse(product.TryGetProperty("detectedAllergens", out _), "Legacy allergen arrays must not be transported.");
    AssertPropertyNames(product.GetProperty("classification"), "system", "version", "code", "officialLabel", "hierarchy", "origin", "confidence", "evidence");
    AssertPropertyNames(product.GetProperty("metadata"), "isEdited", "isComplete", "isSoftDeleted", "confidence");

    AssertPropertyNames(allergenAssessment, "status", "signals");
    Assert.IsFalse(allergenAssessment.TryGetProperty("sourceRunId", out _), "Internal analysis-run identifiers must not be transported.");
    Assert.AreEqual("detected", allergenAssessment.GetProperty("status").GetString());
    JsonElement signal = allergenAssessment.GetProperty("signals")[0];
    AssertPropertyNames(signal, "code", "evidenceLevel", "confidence", "evidence");
    Assert.AreEqual("cerealsContainingGluten", signal.GetProperty("code").GetString());
    Assert.AreEqual("explicit", signal.GetProperty("evidenceLevel").GetString());
    AssertPropertyNames(signal.GetProperty("evidence")[0], "source", "value");

    AssertPropertyNames(recipe, "name", "description", "servings", "preparationMinutes", "cookingMinutes", "totalMinutes", "difficulty", "purchasedIngredients", "assumedPantryStaples", "missingOptionalIngredients", "steps", "allergenWarnings");
    Assert.IsFalse(recipe.TryGetProperty("sourceRunId", out _), "Internal analysis-run identifiers must not be transported.");
    Assert.IsFalse(recipe.TryGetProperty("referenceForMoreDetails", out _), "The retired fake recipe URL must not be transported.");
    Assert.AreEqual("easy", recipe.GetProperty("difficulty").GetString());
    Assert.AreEqual("cerealsContainingGluten", recipe.GetProperty("allergenWarnings")[0].GetString());
    AssertPropertyNames(recipe.GetProperty("purchasedIngredients")[0], "name", "quantity", "preparation");
    Assert.AreEqual(JsonValueKind.Null, recipe.GetProperty("purchasedIngredients")[0].GetProperty("preparation").ValueKind);
    AssertPropertyNames(recipe.GetProperty("steps")[0], "sequence", "instruction", "notes");
    Assert.AreEqual(JsonValueKind.Null, recipe.GetProperty("steps")[0].GetProperty("notes").ValueKind);

    AssertPropertyNames(root.GetProperty("scans")[0], "type", "location");
    Assert.IsFalse(root.GetProperty("scans")[0].TryGetProperty("metadata", out _), "Raw scan metadata must not be transported.");
    AssertPropertyNames(root.GetProperty("paymentInformation"), "transactionDate", "paymentType", "currency", "totalCostAmount", "totalTaxAmount", "subtotalAmount", "tipAmount");
    AssertPropertyNames(root.GetProperty("paymentInformation").GetProperty("currency"), "name", "code", "symbol");
    AssertPropertyNames(root.GetProperty("taxDetails")[0], "amount", "rate", "netAmount", "description");
    AssertPropertyNames(root.GetProperty("payments")[0], "method", "amount");
    Assert.AreEqual(JsonValueKind.Null, root.GetProperty("additionalMetadata").GetProperty("user.optional").ValueKind);
    Assert.AreEqual(JsonValueKind.String, root.GetProperty("additionalMetadata").GetProperty("raw.ocr").ValueKind);
  }

  /// <summary>
  /// Verifies optional analysis fields serialize as explicit nulls and merchant fields retain their complete contract.
  /// </summary>
  [TestMethod]
  public void SerializeProductAndMerchantResponses_UnenrichedValues_PreserveNullabilityAndExactKeySets()
  {
    // Arrange
    var product = new Product
    {
      Name = "Unclassified product",
      Quantity = 1m,
      QuantityUnit = "pcs",
      ProductCode = string.Empty,
      Price = 2.5m,
      Metadata = new ProductMetadata
      {
        IsEdited = false,
        IsComplete = false,
        IsSoftDeleted = false,
        Confidence = 0d,
      },
    };
    var merchant = new Merchant
    {
      id = Guid.Parse("88888888-8888-7888-8888-888888888888"),
      Name = "Independent merchant",
      Description = string.Empty,
      Classification = null,
      Address = new ContactInformation
      {
        FullName = "Independent merchant SRL",
        Address = "1 Market Street",
        PhoneNumber = "+40 700 000 000",
        EmailAddress = "contact@example.test",
        Website = "https://example.test",
      },
      ParentCompanyId = Guid.Empty,
      ReferencedInvoices = [Guid.Parse("99999999-9999-7999-8999-999999999999")],
      AdditionalMetadata = new Dictionary<string, string> { ["source"] = "manual" },
      IsImportant = true,
      CreatedAt = new DateTimeOffset(2026, 8, 18, 0, 0, 0, TimeSpan.Zero),
      CreatedBy = Guid.Parse("aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa"),
      NumberOfUpdates = 3,
    };

    // Act
    using JsonDocument productDocument = JsonDocument.Parse(JsonSerializer.Serialize(ProductResponseDto.FromProduct(product), ApiJsonOptions));
    using JsonDocument merchantDocument = JsonDocument.Parse(JsonSerializer.Serialize(MerchantResponseDto.FromMerchant(merchant), ApiJsonOptions));
    JsonElement productRoot = productDocument.RootElement;
    JsonElement merchantRoot = merchantDocument.RootElement;

    // Assert
    AssertPropertyNames(productRoot, "name", "classification", "quantity", "quantityUnit", "productCode", "price", "totalPrice", "allergenAssessment", "metadata");
    Assert.AreEqual(JsonValueKind.Null, productRoot.GetProperty("classification").ValueKind);
    Assert.AreEqual(JsonValueKind.Null, productRoot.GetProperty("allergenAssessment").ValueKind);

    AssertPropertyNames(
      merchantRoot,
      "id",
      "name",
      "description",
      "classification",
      "address",
      "parentCompanyId",
      "referencedInvoiceCount",
      "referencedInvoiceIds",
      "additionalMetadata",
      "isImportant",
      "isSoftDeleted",
      "createdAt",
      "createdBy",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "numberOfUpdates");
    Assert.IsFalse(merchantRoot.TryGetProperty("category", out _), "Legacy merchant category must not be transported.");
    Assert.AreEqual(JsonValueKind.Null, merchantRoot.GetProperty("classification").ValueKind);
    AssertPropertyNames(merchantRoot.GetProperty("address"), "fullName", "address", "phoneNumber", "emailAddress", "website");
    Assert.AreEqual(1, merchantRoot.GetProperty("referencedInvoiceCount").GetInt32());
  }

  /// <summary>
  /// Verifies the invoice retrieval endpoint emits the same full transport DTO as direct projection.
  /// </summary>
  [TestMethod]
  public async Task RetrieveSpecificInvoiceAsync_RichInvoice_EmitsCompleteInvoiceResponseDto()
  {
    // Arrange
    Invoice invoice = CreateRichInvoice();
    var processingService = new Mock<IInvoiceManagementService>(MockBehavior.Strict);
    processingService
      .Setup(service => service.ReadInvoice(invoice.id, invoice.UserIdentifier, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);

    var services = new ServiceCollection();
    services.AddLogging();
    services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(_ => { });
    using ServiceProvider serviceProvider = services.BuildServiceProvider();
    var context = new DefaultHttpContext
    {
      User = new ClaimsPrincipal(
        new ClaimsIdentity([new Claim("userIdentifier", invoice.UserIdentifier.ToString())], authenticationType: "Test")),
      RequestServices = serviceProvider,
    };
    context.Response.Body = new MemoryStream();
    var accessor = new HttpContextAccessor { HttpContext = context };

    // Act
    IResult result = await InvoiceEndpoints
      .RetrieveSpecificInvoiceAsync(processingService.Object, accessor, invoice.id, CancellationToken.None)
      .ConfigureAwait(false);
    await result.ExecuteAsync(context).ConfigureAwait(false);
    context.Response.Body.Position = 0;
    using JsonDocument document = await JsonDocument
      .ParseAsync(context.Response.Body, cancellationToken: CancellationToken.None)
      .ConfigureAwait(false);

    // Assert
    Assert.AreEqual(StatusCodes.Status200OK, context.Response.StatusCode);
    AssertPropertyNames(
      document.RootElement,
      "id",
      "userIdentifier",
      "sharedWith",
      "name",
      "description",
      "classification",
      "scans",
      "paymentInformation",
      "merchantReference",
      "items",
      "possibleRecipes",
      "additionalMetadata",
      "receiptType",
      "countryRegion",
      "taxDetails",
      "payments",
      "isImportant",
      "isSoftDeleted",
      "createdAt",
      "createdBy",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "numberOfUpdates");
    Assert.IsFalse(document.RootElement.TryGetProperty("category", out _));
    Assert.IsFalse(document.RootElement.GetProperty("items")[0].GetProperty("allergenAssessment").TryGetProperty("sourceRunId", out _));
    processingService.Verify(
      service => service.ReadInvoice(invoice.id, invoice.UserIdentifier, It.IsAny<CancellationToken>()),
      Times.Once);
  }

  private static Invoice CreateRichInvoice()
  {
    Guid invoiceIdentifier = Guid.Parse("22222222-2222-7222-8222-222222222222");
    Guid userIdentifier = Guid.Parse("33333333-3333-7333-8333-333333333333");
    Guid updaterIdentifier = Guid.Parse("44444444-4444-7444-8444-444444444444");
    StandardClassification invoiceClassification = CreateClassification(
      ClassificationSystem.EcoicopV2,
      "01.1",
      "Food",
      ClassificationOrigin.Analysis,
      0.97d);
    StandardClassification productClassification = CreateClassification(
      ClassificationSystem.Gs1Gpc,
      "10000045",
      "Bread",
      ClassificationOrigin.Manual,
      null);
    AllergenAssessment assessment = AllergenAssessment.Detected(
      [
        new AllergenSignal(
          AllergenCode.CerealsContainingGluten,
          AllergenEvidenceLevel.Explicit,
          0.99d,
          [new AllergenEvidence("ingredient.label", "Contains wheat")]),
      ]);
    var recipe = new RecipeSuggestion(
      "Toast",
      "A simple toast.",
      1,
      1,
      2,
      3,
      RecipeDifficulty.Easy,
      [new RecipeIngredient("Bread", "2 slices", null)],
      [new RecipeIngredient("Salt", "a pinch", "Optional")],
      [new RecipeIngredient("Butter", "1 tsp", null)],
      [new RecipeStep(1, "Toast the bread.", null)],
      [AllergenCode.CerealsContainingGluten]);

    var invoice = new Invoice
    {
      id = invoiceIdentifier,
      UserIdentifier = userIdentifier,
      SharedWith = [Guid.Parse("55555555-5555-7555-8555-555555555555")],
      Name = "Bakery receipt",
      Description = "Wholemeal bread",
      Classification = invoiceClassification,
      Scans =
      [
        new InvoiceScan(
          ScanType.PDF,
          new Uri("https://example.test/receipts/bakery.pdf"),
          new Dictionary<string, object> { ["raw.ocr"] = "Do not transport" }),
      ],
      PaymentInformation = new PaymentInformation
      {
        TransactionDate = new DateTimeOffset(2026, 8, 17, 12, 30, 0, TimeSpan.Zero),
        PaymentType = PaymentType.CARD,
        Currency = new Currency("Romanian Leu", "RON", "lei"),
        TotalCostAmount = 12.5m,
        TotalTaxAmount = 2m,
        SubtotalAmount = 10m,
        TipAmount = 0.5m,
      },
      MerchantReference = Guid.Parse("66666666-6666-7666-8666-666666666666"),
      Items =
      [
        new Product
        {
          Name = "Wholemeal bread",
          Classification = productClassification,
          Quantity = 1m,
          QuantityUnit = "pcs",
          ProductCode = "5940000000001",
          Price = 12.5m,
          AllergenAssessment = assessment,
          Metadata = new ProductMetadata
          {
            IsEdited = true,
            IsComplete = true,
            IsSoftDeleted = false,
            Confidence = 0.99d,
          },
        },
      ],
      PossibleRecipes = [recipe],
      AdditionalMetadata = new Dictionary<string, object>
      {
        ["user.note"] = "Use before Friday",
        ["user.optional"] = null!,
        ["analysis.score"] = 0.97d,
        ["raw.ocr"] = new Dictionary<string, string> { ["content"] = "Do not transport" },
      },
      ReceiptType = "Itemized",
      CountryRegion = "RO",
      TaxDetails =
      [
        new TaxDetail
        {
          Amount = 2m,
          Rate = 19m,
          NetAmount = 10m,
          Description = "VAT",
        },
      ],
      Payments = [new PaymentDetail { Method = "Credit Card", Amount = 12.5m }],
      IsImportant = true,
      CreatedAt = new DateTimeOffset(2026, 8, 17, 12, 0, 0, TimeSpan.Zero),
      CreatedBy = userIdentifier,
      NumberOfUpdates = 7,
    };
    invoice.PerformUpdate(updaterIdentifier);

    return invoice;
  }

  private static StandardClassification CreateClassification(
    ClassificationSystem system,
    string code,
    string label,
    ClassificationOrigin origin,
    double? confidence) =>
    new(
      system,
      "2026.08",
      code,
      label,
      [new ClassificationNode("class", code, label)],
      origin,
      confidence,
      [new ClassificationEvidence("receipt", label)]);

  private static void AssertPropertyNames(JsonElement element, params string[] expectedPropertyNames)
  {
    string[] actualPropertyNames = element
      .EnumerateObject()
      .Select(property => property.Name)
      .OrderBy(name => name, StringComparer.Ordinal)
      .ToArray();
    string[] orderedExpectedPropertyNames = expectedPropertyNames
      .OrderBy(name => name, StringComparer.Ordinal)
      .ToArray();

    CollectionAssert.AreEqual(orderedExpectedPropertyNames, actualPropertyNames);
  }
}
