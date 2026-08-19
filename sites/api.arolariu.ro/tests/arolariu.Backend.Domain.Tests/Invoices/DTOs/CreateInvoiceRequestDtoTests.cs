namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies the secure, client-editable invoice creation transport contract.
/// </summary>
[TestClass]
public sealed class CreateInvoiceRequestDtoTests
{
  private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

  /// <summary>
  /// Verifies approved create fields are mapped while ownership and audit identities use the server-derived owner.
  /// </summary>
  [TestMethod]
  public void ToInvoice_ApprovedClientFields_MapsFieldsAndPreservesServerOwnership()
  {
    // Arrange
    Guid serverOwnerIdentifier = Guid.NewGuid();
    Guid merchantIdentifier = Guid.NewGuid();
    DateTimeOffset transactionDate = new(2026, 8, 18, 7, 0, 0, TimeSpan.Zero);
    var request = new CreateInvoiceRequestDto(
      Name: "Weekly groceries",
      Description: "Fresh produce and pantry supplies",
      Classification: new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "01.1.1"),
      PaymentInformation: new PaymentInformation
      {
        TransactionDate = transactionDate,
        PaymentType = PaymentType.CARD,
        Currency = new Currency("Romanian Leu", "RON", "lei"),
        TotalCostAmount = 125.50m,
        TotalTaxAmount = 19.50m,
        SubtotalAmount = 106.00m,
        TipAmount = 0m,
      },
      MerchantReference: merchantIdentifier,
      IsImportant: true,
      Scans:
      [
        new CreateInvoiceScanRequestDto(ScanType.BMP, new Uri("https://example.test/invoices/receipt.bmp"), null),
        new CreateInvoiceScanRequestDto(ScanType.HEIF, new Uri("https://example.test/invoices/receipt.heif"), null),
      ],
      Items:
      [
        new CreateInvoiceItemRequestDto(
          Name: "Apples",
          Classification: new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "100001"),
          Quantity: 2m,
          QuantityUnit: "kg",
          ProductCode: "APL-01",
          Price: 8.50m),
      ],
      Metadata: new Dictionary<string, object>
      {
        ["source"] = "wizard",
        ["optional"] = null!,
      });

    // Act
    Invoice invoice = request.ToInvoice(serverOwnerIdentifier);

    // Assert
    Assert.AreEqual(serverOwnerIdentifier, invoice.UserIdentifier);
    Assert.AreEqual(serverOwnerIdentifier, invoice.CreatedBy);
    Assert.AreEqual(serverOwnerIdentifier, invoice.LastUpdatedBy);
    Assert.AreEqual(0, invoice.SharedWith.Count);
    Assert.IsFalse(invoice.IsSoftDeleted);
    Assert.AreEqual(0, invoice.PossibleRecipes.Count);
    Assert.AreEqual(0, invoice.TaxDetails.Count);
    Assert.AreEqual(0, invoice.Payments.Count);
    Assert.AreEqual("Weekly groceries", invoice.Name);
    Assert.AreEqual("Fresh produce and pantry supplies", invoice.Description);
    Assert.IsTrue(invoice.IsImportant);
    Assert.AreEqual(merchantIdentifier, invoice.MerchantReference);
    Assert.AreEqual("01.1.1", invoice.Classification?.Code);
    Assert.AreEqual(ClassificationOrigin.Manual, invoice.Classification?.Origin);
    Assert.AreEqual(transactionDate, invoice.PaymentInformation.TransactionDate);
    Assert.AreEqual(PaymentType.CARD, invoice.PaymentInformation.PaymentType);
    Assert.AreEqual("RON", invoice.PaymentInformation.Currency.Code);
    Assert.AreEqual(125.50m, invoice.PaymentInformation.TotalCostAmount);
    Assert.AreEqual(19.50m, invoice.PaymentInformation.TotalTaxAmount);
    Assert.AreEqual(106.00m, invoice.PaymentInformation.SubtotalAmount);
    Assert.AreEqual(2, invoice.Scans.Count);
    List<InvoiceScan> scans = [.. invoice.Scans];
    Assert.AreEqual(ScanType.BMP, scans[0].Type);
    Assert.AreEqual(ScanType.HEIF, scans[1].Type);
    Assert.ContainsSingle(invoice.Items);
    Assert.AreEqual("Apples", invoice.Items.First().Name);
    Assert.AreEqual("100001", invoice.Items.First().Classification?.Code);
    Assert.IsNull(invoice.Items.First().AllergenAssessment);
    Assert.IsFalse(invoice.Items.First().Metadata.IsEdited);
    Assert.AreEqual("wizard", invoice.AdditionalMetadata["source"]);
    Assert.AreEqual(string.Empty, invoice.AdditionalMetadata["optional"]);
  }

  /// <summary>
  /// Verifies a body-supplied owner is ignored because the public create DTO has no owner transport field.
  /// </summary>
  [TestMethod]
  public void DeserializeAndToInvoice_BodySuppliesOwner_UsesOnlyServerOwner()
  {
    // Arrange
    Guid spoofedBodyOwnerIdentifier = Guid.NewGuid();
    Guid serverOwnerIdentifier = Guid.NewGuid();
    string payload = $$"""
      {
        "userIdentifier": "{{spoofedBodyOwnerIdentifier}}",
        "name": "Secure invoice",
        "description": "Owner is claim-derived",
        "classification": null,
        "paymentInformation": null,
        "merchantReference": null,
        "isImportant": false,
        "scans": [
          {
            "type": 6,
            "location": "https://example.test/invoices/receipt.bmp",
            "metadata": {}
          }
        ],
        "items": null,
        "metadata": {
          "source": "transport-test"
        }
      }
      """;

    // Act
    CreateInvoiceRequestDto request = JsonSerializer.Deserialize<CreateInvoiceRequestDto>(payload, ApiJsonOptions);
    Invoice invoice = request.ToInvoice(serverOwnerIdentifier);
    using JsonDocument serializedRequest = JsonDocument.Parse(JsonSerializer.Serialize(request, ApiJsonOptions));

    // Assert
    Assert.AreEqual(serverOwnerIdentifier, invoice.UserIdentifier);
    Assert.AreNotEqual(spoofedBodyOwnerIdentifier, invoice.UserIdentifier);
    Assert.IsFalse(serializedRequest.RootElement.TryGetProperty("userIdentifier", out _));
  }

  /// <summary>
  /// Verifies each Document Intelligence-supported image extension uses its stable numeric API wire value.
  /// </summary>
  /// <param name="scanType">The supported scan type.</param>
  /// <param name="expectedWireValue">The stable numeric transport value.</param>
  [TestMethod]
  [DataRow(ScanType.BMP, 6)]
  [DataRow(ScanType.TIFF, 7)]
  [DataRow(ScanType.HEIF, 8)]
  public void SerializeInvoiceScanResponse_SupportedExtendedType_UsesStableNumericWireValue(
    ScanType scanType,
    int expectedWireValue)
  {
    // Arrange
    var response = new InvoiceScanResponseDto(scanType, new Uri("https://example.test/receipt"));

    // Act
    using JsonDocument document = JsonDocument.Parse(JsonSerializer.Serialize(response, ApiJsonOptions));

    // Assert
    Assert.AreEqual(expectedWireValue, document.RootElement.GetProperty("type").GetInt32());
  }

  /// <summary>
  /// Verifies HEIC is rejected before an unsupported scan can enter persistence or Document Intelligence.
  /// </summary>
  [TestMethod]
  public void TryValidate_UndocumentedHeicValue_ReturnsValidationFailure()
  {
    // Arrange
    var request = new CreateInvoiceScanRequestDto(
      Type: (ScanType)9,
      Location: new Uri("https://example.test/invoices/receipt.heic"),
      Metadata: null);

    // Act
    bool isValid = request.TryValidate(out Dictionary<string, string[]> validationErrors);

    // Assert
    Assert.IsFalse(isValid);
    Assert.HasCount(1, validationErrors);
    Assert.IsTrue(validationErrors.ContainsKey(nameof(CreateInvoiceScanRequestDto.Type)));
  }

  private static LocalOptions CreateStorageOptions() =>
    new()
    {
      StorageAccountName = "example",
      StorageAccountEndpoint = "https://example.test",
    };
}
