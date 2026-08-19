namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Linq;
using System.Text.Json;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Tests.Builders;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Newtonsoft.Json;

/// <summary>
/// Guards classification persistence through the serializer used by the Cosmos SDK.
/// </summary>
[TestClass]
public sealed class ClassificationPersistenceSerializationTests
{
  private static readonly JsonSerializerOptions WebJsonOptions =
    new(JsonSerializerDefaults.Web);

  /// <summary>Verifies invoice and nested product snapshots survive persistence serialization.</summary>
  [TestMethod]
  public void InvoiceAndProduct_Classifications_SurviveCosmosSerializerRoundTrip()
  {
    ITaxonomyBroker taxonomy = TaxonomyBrokerTestFactory.Create();
    Invoice invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Classification = taxonomy.Resolve(
      ClassificationSystem.EcoicopV2,
      TaxonomyBrokerTestFactory.EcoicopCode,
      ClassificationOrigin.Manual,
      null,
      []);
    Product product = invoice.Items.First();
    product.Classification = taxonomy.Resolve(
      ClassificationSystem.Gs1Gpc,
      TaxonomyBrokerTestFactory.GpcCode,
      ClassificationOrigin.Manual,
      null,
      []);

    Invoice roundTripped = RoundTrip(invoice);

    Assert.AreEqual(invoice.Classification, roundTripped.Classification);
    Assert.AreEqual(product.Classification, roundTripped.Items.First().Classification);
  }

  /// <summary>Verifies merchant snapshots survive persistence serialization.</summary>
  [TestMethod]
  public void Merchant_Classification_SurvivesCosmosSerializerRoundTrip()
  {
    Merchant merchant = MerchantTestDataBuilder.CreateRandomMerchant();
    merchant.Classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.Nace21,
      TaxonomyBrokerTestFactory.NaceCode,
      ClassificationOrigin.Manual,
      null,
      []);

    Merchant roundTripped = RoundTrip(merchant);

    Assert.AreEqual(merchant.Classification, roundTripped.Classification);
  }

  /// <summary>Verifies legacy invoice categories are not fabricated into taxonomy codes.</summary>
  [TestMethod]
  public void LegacyInvoicePrimitiveFieldDocument_DeserializesAsUnclassified()
  {
    string json = $$"""
      {
        "id": "{{Guid.NewGuid()}}",
        "UserIdentifier": "{{Guid.NewGuid()}}",
        "Category": "GROCERY"
      }
      """;

    Invoice invoice = JsonConvert.DeserializeObject<Invoice>(json)
      ?? throw new AssertFailedException("Legacy invoice deserialized to null.");

    Assert.IsNull(invoice.Classification);
  }

  /// <summary>Verifies legacy nested product categories deserialize as unclassified.</summary>
  [TestMethod]
  public void LegacyNestedProductPrimitiveFieldDocument_DeserializesAsUnclassified()
  {
    string json = $$"""
      {
        "id": "{{Guid.NewGuid()}}",
        "UserIdentifier": "{{Guid.NewGuid()}}",
        "Items": [
          {
            "Name": "Milk",
            "Category": "DAIRY",
            "Quantity": 1,
            "Price": 8.5
          }
        ]
      }
      """;

    Invoice invoice = JsonConvert.DeserializeObject<Invoice>(json)
      ?? throw new AssertFailedException("Legacy invoice deserialized to null.");

    Assert.IsNull(invoice.Items.Single().Classification);
  }

  /// <summary>Verifies legacy merchant categories deserialize as unclassified.</summary>
  [TestMethod]
  public void LegacyMerchantPrimitiveFieldDocument_DeserializesAsUnclassified()
  {
    string json = $$"""
      {
        "id": "{{Guid.NewGuid()}}",
        "Name": "Store",
        "Category": "SUPERMARKET"
      }
      """;

    Merchant merchant = JsonConvert.DeserializeObject<Merchant>(json)
      ?? throw new AssertFailedException("Legacy merchant deserialized to null.");

    Assert.IsNull(merchant.Classification);
  }

  /// <summary>Verifies pending mutation state cannot escape through API or Cosmos serialization.</summary>
  [TestMethod]
  public void PendingSelection_IsExcludedFromApiAndCosmosSerialization()
  {
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      PendingClassificationSelection =
        new ClassificationSelection(
          ClassificationSystem.EcoicopV2,
          TaxonomyBrokerTestFactory.EcoicopCode),
    };

    string cosmosJson = JsonConvert.SerializeObject(invoice);
    string apiJson = System.Text.Json.JsonSerializer.Serialize(invoice);

    Assert.IsFalse(cosmosJson.Contains("PendingClassificationSelection", StringComparison.Ordinal));
    Assert.IsFalse(apiJson.Contains("pendingClassificationSelection", StringComparison.Ordinal));
  }

  /// <summary>Verifies API responses retain canonical string enum wire values.</summary>
  [TestMethod]
  public void ApiResponse_Classification_UsesCanonicalStringWireValues()
  {
    Invoice invoice = InvoiceBuilder.CreateRandomInvoice();
    invoice.Classification = TaxonomyBrokerTestFactory.Create().Resolve(
      ClassificationSystem.EcoicopV2,
      TaxonomyBrokerTestFactory.EcoicopCode,
      ClassificationOrigin.Manual,
      null,
      []);
    InvoiceResponseDto response = InvoiceResponseDto.FromInvoice(invoice);

    string json = System.Text.Json.JsonSerializer.Serialize(
      response,
      WebJsonOptions);

    StringAssert.Contains(json, "\"classification\":", StringComparison.Ordinal);
    StringAssert.Contains(json, "\"system\":\"ECOICOP_V2\"", StringComparison.Ordinal);
  }

  /// <summary>Verifies full classifications cannot be deserialized as request selections.</summary>
  [TestMethod]
  public void ApiRequest_ClassificationWithCanonicalMetadata_IsRejected()
  {
    string json = """
      {
        "name": "Groceries",
        "description": "Weekly shop",
        "classification": {
          "system": "ECOICOP_V2",
          "code": "01.1",
          "officialLabel": "Caller controlled"
        },
        "paymentInformation": {},
        "merchantReference": null,
        "isImportant": false,
        "additionalMetadata": null
      }
      """;

    Assert.ThrowsExactly<System.Text.Json.JsonException>(() =>
      System.Text.Json.JsonSerializer.Deserialize<UpdateInvoiceRequestDto>(
        json,
        WebJsonOptions));
  }

  /// <summary>Verifies API requests expose only system and code for classification input.</summary>
  [TestMethod]
  public void ApiRequest_Classification_ContainsOnlySystemAndCode()
  {
    var request = new UpdateInvoiceRequestDto(
      "Groceries",
      "Weekly shop",
      new ClassificationSelectionDto(
        ClassificationSystem.EcoicopV2,
        TaxonomyBrokerTestFactory.EcoicopCode),
      new PaymentInformation(),
      null,
      false,
      null);

    string json = System.Text.Json.JsonSerializer.Serialize(
      request,
      WebJsonOptions);

    StringAssert.Contains(json, "\"classification\":", StringComparison.Ordinal);
    StringAssert.Contains(json, "\"system\":\"ECOICOP_V2\"", StringComparison.Ordinal);
    StringAssert.Contains(
      json,
      $"\"code\":\"{TaxonomyBrokerTestFactory.EcoicopCode}\"",
      StringComparison.Ordinal);
    Assert.IsFalse(json.Contains("officialLabel", StringComparison.Ordinal));
    Assert.IsFalse(json.Contains("hierarchy", StringComparison.Ordinal));
    Assert.IsFalse(json.Contains("confidence", StringComparison.Ordinal));
    Assert.IsFalse(json.Contains("evidence", StringComparison.Ordinal));
  }

  private static T RoundTrip<T>(T value)
  {
    string json = JsonConvert.SerializeObject(value);
    return JsonConvert.DeserializeObject<T>(json)
      ?? throw new AssertFailedException($"{typeof(T).Name} deserialized to null.");
  }
}
