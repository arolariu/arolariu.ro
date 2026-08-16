namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Reflection;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Azure.AI.DocumentIntelligence;

/// <summary>
/// Provides deterministic provider-neutral and Azure-model receipt fixtures for tests.
/// </summary>
internal static class ReceiptDocumentTestData
{
  private static readonly ConstructorInfo DocumentFieldConstructor =
    typeof(DocumentField).GetConstructor(
      BindingFlags.Instance | BindingFlags.NonPublic,
      binder: null,
      [
        typeof(DocumentFieldType),
        typeof(string),
        typeof(DateTimeOffset?),
        typeof(TimeSpan?),
        typeof(string),
        typeof(double?),
        typeof(long?),
        typeof(DocumentSelectionMarkState?),
        typeof(DocumentSignatureType?),
        typeof(string),
        typeof(IReadOnlyList<DocumentField>),
        typeof(IReadOnlyDictionary<string, DocumentField>),
        typeof(CurrencyValue),
        typeof(AddressValue),
        typeof(bool?),
        typeof(IReadOnlyList<string>),
        typeof(string),
        typeof(IReadOnlyList<BoundingRegion>),
        typeof(IReadOnlyList<DocumentSpan>),
        typeof(float?),
        typeof(IDictionary<string, BinaryData>),
      ],
      modifiers: null)!;

  private static readonly ConstructorInfo DocumentFieldDictionaryConstructor =
    typeof(DocumentFieldDictionary).GetConstructor(
      BindingFlags.Instance | BindingFlags.NonPublic,
      binder: null,
      [typeof(IReadOnlyDictionary<string, DocumentField>)],
      modifiers: null)!;

  private static readonly ConstructorInfo AnalyzedDocumentConstructor =
    typeof(AnalyzedDocument).GetConstructor(
      BindingFlags.Instance | BindingFlags.NonPublic,
      binder: null,
      [
        typeof(string),
        typeof(IReadOnlyList<BoundingRegion>),
        typeof(IReadOnlyList<DocumentSpan>),
        typeof(IReadOnlyDictionary<string, DocumentField>),
        typeof(float),
        typeof(IDictionary<string, BinaryData>),
      ],
      modifiers: null)!;

  private static readonly ConstructorInfo CurrencyValueConstructor =
    typeof(CurrencyValue).GetConstructor(
      BindingFlags.Instance | BindingFlags.NonPublic,
      binder: null,
      [
        typeof(double),
        typeof(string),
        typeof(string),
        typeof(IDictionary<string, BinaryData>),
      ],
      modifiers: null)!;

  /// <summary>
  /// Creates a simple provider-neutral receipt page with the supplied product sequence.
  /// </summary>
  /// <param name="productName">The first product name.</param>
  /// <param name="quantity">The first product quantity.</param>
  /// <param name="additionalProducts">Additional alternating product-name and quantity pairs.</param>
  /// <returns>A provider-neutral receipt document.</returns>
  public static ReceiptDocument Page(
    string productName,
    decimal quantity,
    params object[] additionalProducts)
  {
    var products = new List<ReceiptProductDocument>
    {
      Product(productName, quantity, quantityUnit: "pcs", productCode: string.Empty, price: 1.00m, totalPrice: quantity),
    };

    for (int index = 0; index < additionalProducts.Length; index += 2)
    {
      string additionalName = (string)additionalProducts[index];
      decimal additionalQuantity = Convert.ToDecimal(additionalProducts[index + 1], System.Globalization.CultureInfo.InvariantCulture);

      products.Add(Product(additionalName, additionalQuantity, quantityUnit: "pcs", productCode: string.Empty, price: 1.00m, totalPrice: additionalQuantity));
    }

    return Document(products: products);
  }

  /// <summary>
  /// Creates a provider-neutral receipt document.
  /// </summary>
  /// <param name="merchantName">The merchant name.</param>
  /// <param name="merchantAddress">The merchant address.</param>
  /// <param name="merchantPhoneNumber">The merchant phone number.</param>
  /// <param name="products">The extracted products.</param>
  /// <param name="paymentInformation">The extracted payment information.</param>
  /// <param name="receiptType">The extracted receipt type.</param>
  /// <param name="countryRegion">The extracted country or region.</param>
  /// <param name="taxDetails">The extracted tax lines.</param>
  /// <param name="payments">The extracted payment lines.</param>
  /// <returns>A provider-neutral receipt document.</returns>
  public static ReceiptDocument Document(
    IEnumerable<ReceiptProductDocument>? products = null,
    string merchantName = "",
    string merchantAddress = "",
    string merchantPhoneNumber = "",
    ReceiptPaymentDocument? paymentInformation = null,
    string receiptType = "",
    string countryRegion = "",
    IEnumerable<ReceiptTaxDocument>? taxDetails = null,
    IEnumerable<ReceiptPaymentLineDocument>? payments = null)
  {
    return new ReceiptDocument(
      merchant: new ReceiptMerchantDocument(
        Name: Field(merchantName, 0.98),
        Address: Field(merchantAddress, 0.97),
        PhoneNumber: Field(merchantPhoneNumber, 0.96)),
      products: products is null ? [] : [.. products],
      payment: paymentInformation ?? Payment(),
      receiptType: Field(receiptType, 0.95),
      countryRegion: Field(countryRegion, 0.94),
      taxDetails: taxDetails is null ? [] : [.. taxDetails],
      payments: payments is null ? [] : [.. payments]);
  }

  /// <summary>
  /// Creates a provider-neutral product line.
  /// </summary>
  /// <param name="name">The product name.</param>
  /// <param name="quantity">The quantity.</param>
  /// <param name="quantityUnit">The quantity unit.</param>
  /// <param name="productCode">The product code.</param>
  /// <param name="price">The unit price.</param>
  /// <param name="totalPrice">The total price.</param>
  /// <param name="confidence">The line confidence.</param>
  /// <returns>A provider-neutral product line.</returns>
  public static ReceiptProductDocument Product(
    string name,
    decimal quantity,
    string quantityUnit,
    string productCode,
    decimal price,
    decimal? totalPrice = null,
    double confidence = 0.91)
  {
    return new ReceiptProductDocument(
      Name: Field(name, 0.98),
      Quantity: DecimalField(quantity, 0.97),
      QuantityUnit: Field(quantityUnit, 0.96),
      ProductCode: Field(productCode, 0.95),
      Price: DecimalField(price, 0.94),
      TotalPrice: totalPrice is null ? DecimalField(null, 0.00) : DecimalField(totalPrice.Value, 0.93),
      Confidence: confidence);
  }

  /// <summary>
  /// Creates a provider-neutral payment-information section.
  /// </summary>
  /// <param name="transactionDate">The transaction date.</param>
  /// <param name="currency">The extracted currency.</param>
  /// <param name="total">The extracted total.</param>
  /// <param name="tax">The extracted total tax.</param>
  /// <param name="subtotal">The extracted subtotal.</param>
  /// <param name="tip">The extracted tip.</param>
  /// <returns>A provider-neutral payment-information section.</returns>
  public static ReceiptPaymentDocument Payment(
    DateTimeOffset? transactionDate = null,
    Currency? currency = null,
    decimal? total = null,
    decimal? tax = null,
    decimal? subtotal = null,
    decimal? tip = null)
  {
    return new ReceiptPaymentDocument(
      TransactionDate: DateField(transactionDate, 0.90),
      Currency: CurrencyField(currency, 0.89),
      TotalAmount: DecimalField(total, 0.88),
      TotalTaxAmount: DecimalField(tax, 0.87),
      SubtotalAmount: DecimalField(subtotal, 0.86),
      TipAmount: DecimalField(tip, 0.85));
  }

  /// <summary>
  /// Creates a provider-neutral tax line.
  /// </summary>
  /// <param name="amount">The tax amount.</param>
  /// <param name="rate">The tax rate.</param>
  /// <param name="netAmount">The pre-tax net amount.</param>
  /// <param name="description">The tax description.</param>
  /// <returns>A provider-neutral tax line.</returns>
  public static ReceiptTaxDocument Tax(
    decimal amount,
    decimal rate,
    decimal netAmount,
    string description) =>
      new(
        Amount: DecimalField(amount, 0.84),
        Rate: DecimalField(rate, 0.83),
        NetAmount: DecimalField(netAmount, 0.82),
        Description: Field(description, 0.81),
        Confidence: 0.80);

  /// <summary>
  /// Creates a provider-neutral payment line.
  /// </summary>
  /// <param name="method">The payment method.</param>
  /// <param name="amount">The payment amount.</param>
  /// <returns>A provider-neutral payment line.</returns>
  public static ReceiptPaymentLineDocument Tender(string method, decimal amount) =>
    new(
      Method: Field(method, 0.79),
      Amount: DecimalField(amount, 0.78),
      Confidence: 0.77);

  /// <summary>
  /// Creates an analyzed-document fixture covering merchant, product, tax, payment, and country fields.
  /// </summary>
  /// <returns>An Azure analyzed document fixture.</returns>
  public static AnalyzedDocument AzureAnalyzedDocument()
  {
    var fields = new Dictionary<string, DocumentField>
    {
      ["MerchantName"] = StringDocumentField("Contoso Market", 0.98f),
      ["MerchantAddress"] = StringDocumentField("1 Example Street", 0.97f),
      ["MerchantPhoneNumber"] = StringDocumentField("+40 700 000 000", 0.96f),
      ["ReceiptType"] = StringDocumentField("itemized", 0.95f),
      ["CountryRegion"] = CountryRegionDocumentField("RO", 0.94f),
      ["TransactionDate"] = DateDocumentField(new DateTimeOffset(2026, 08, 16, 0, 0, 0, TimeSpan.Zero), 0.93f),
      ["TransactionTime"] = TimeDocumentField(TimeSpan.FromHours(12).Add(TimeSpan.FromMinutes(34)), 0.92f),
      ["Total"] = CurrencyDocumentField(15.50, "RON", "lei", 0.91f),
      ["TotalTax"] = CurrencyDocumentField(2.50, "RON", "lei", 0.90f),
      ["Subtotal"] = CurrencyDocumentField(13.00, "RON", "lei", 0.89f),
      ["Tip"] = CurrencyDocumentField(1.00, "RON", "lei", 0.88f),
      ["Items"] = ListDocumentField(
        [
          DictionaryDocumentField(
            new Dictionary<string, DocumentField>
            {
              { "Description", StringDocumentField("Milk", 0.87f) },
              { "Quantity", DoubleDocumentField(2.0, 0.86f) },
              { "QuantityUnit", StringDocumentField("pcs", 0.85f) },
              { "ProductCode", StringDocumentField("SKU-1", 0.84f) },
              { "Price", CurrencyDocumentField(4.50, "RON", "lei", 0.83f) },
              { "TotalPrice", CurrencyDocumentField(9.00, "RON", "lei", 0.82f) },
            },
            0.81f),
        ],
        0.80f),
      ["TaxDetails"] = ListDocumentField(
        [
          DictionaryDocumentField(
            new Dictionary<string, DocumentField>
            {
              { "Amount", CurrencyDocumentField(2.50, "RON", "lei", 0.79f) },
              { "Rate", DoubleDocumentField(19.0, 0.78f) },
              { "NetAmount", CurrencyDocumentField(13.00, "RON", "lei", 0.77f) },
              { "Description", StringDocumentField("VAT", 0.76f) },
            },
            0.75f),
        ],
        0.74f),
      ["Payments"] = ListDocumentField(
        [
          DictionaryDocumentField(
            new Dictionary<string, DocumentField>
            {
              { "Method", StringDocumentField("card", 0.73f) },
              { "Amount", CurrencyDocumentField(15.50, "RON", "lei", 0.72f) },
            },
            0.71f),
        ],
        0.70f),
    };

    return (AnalyzedDocument)AnalyzedDocumentConstructor.Invoke(
      [
        "receipt",
        Array.Empty<BoundingRegion>(),
        Array.Empty<DocumentSpan>(),
        fields,
        0.99f,
        new Dictionary<string, BinaryData>(),
      ]);
  }

  private static DocumentValue<string> Field(string value, double confidence) =>
    new(value, confidence, sourceScanIndex: -1);

  private static DocumentValue<decimal?> DecimalField(decimal? value, double confidence) =>
    new(value, confidence, sourceScanIndex: -1);

  private static DocumentValue<DateTimeOffset?> DateField(DateTimeOffset? value, double confidence) =>
    new(value, confidence, sourceScanIndex: -1);

  private static DocumentValue<Currency?> CurrencyField(Currency? value, double confidence) =>
    new(value, confidence, sourceScanIndex: -1);

  private static DocumentField StringDocumentField(string value, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.String,
      valueString: value,
      content: value,
      confidence: confidence);

  private static DocumentField CountryRegionDocumentField(string value, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.CountryRegion,
      valueCountryRegion: value,
      content: value,
      confidence: confidence);

  private static DocumentField DateDocumentField(DateTimeOffset value, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.Date,
      valueDate: value,
      content: value.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
      confidence: confidence);

  private static DocumentField TimeDocumentField(TimeSpan value, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.Time,
      valueTime: value,
      content: value.ToString("hh\\:mm", System.Globalization.CultureInfo.InvariantCulture),
      confidence: confidence);

  private static DocumentField DoubleDocumentField(double value, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.Double,
      valueDouble: value,
      content: value.ToString(System.Globalization.CultureInfo.InvariantCulture),
      confidence: confidence);

  private static DocumentField CurrencyDocumentField(double amount, string currencyCode, string currencySymbol, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.Currency,
      valueCurrency: (CurrencyValue)CurrencyValueConstructor.Invoke(
        [
          amount,
          currencySymbol,
          currencyCode,
          new Dictionary<string, BinaryData>(),
        ]),
      content: amount.ToString(System.Globalization.CultureInfo.InvariantCulture),
      confidence: confidence);

  private static DocumentField ListDocumentField(IReadOnlyList<DocumentField> values, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.List,
      valueList: values,
      content: string.Empty,
      confidence: confidence);

  private static DocumentField DictionaryDocumentField(IReadOnlyDictionary<string, DocumentField> values, float confidence) =>
    CreateDocumentField(
      DocumentFieldType.Dictionary,
      valueDictionary: (DocumentFieldDictionary)DocumentFieldDictionaryConstructor.Invoke([values]),
      content: string.Empty,
      confidence: confidence);

  private static DocumentField CreateDocumentField(
    DocumentFieldType fieldType,
    string? valueString = null,
    DateTimeOffset? valueDate = null,
    TimeSpan? valueTime = null,
    string? valuePhoneNumber = null,
    double? valueDouble = null,
    long? valueInt64 = null,
    string? valueCountryRegion = null,
    IReadOnlyList<DocumentField>? valueList = null,
    DocumentFieldDictionary? valueDictionary = null,
    CurrencyValue? valueCurrency = null,
    string content = "",
    float? confidence = null) =>
      (DocumentField)DocumentFieldConstructor.Invoke(
        [
          fieldType,
          valueString,
          valueDate,
          valueTime,
          valuePhoneNumber,
          valueDouble,
          valueInt64,
          null,
          null,
          valueCountryRegion,
          valueList,
          valueDictionary,
          valueCurrency,
          null!,
          null,
          null!,
          content,
          Array.Empty<BoundingRegion>(),
          Array.Empty<DocumentSpan>(),
          confidence,
          new Dictionary<string, BinaryData>(),
        ]);
}
