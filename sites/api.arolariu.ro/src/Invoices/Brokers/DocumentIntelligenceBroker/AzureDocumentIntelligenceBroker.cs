namespace arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using Azure;
using Azure.AI.DocumentIntelligence;
using Azure.Core;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Uses Azure Document Intelligence to extract provider-neutral receipt documents from scan URIs.
/// </summary>
/// <remarks>
/// <para>
/// This broker is intentionally thin: it invokes the Azure SDK, maps the provider response into
/// <see cref="ReceiptDocument"/>, and returns that immutable provider-neutral contract.
/// </para>
/// <para>
/// It does not accept or mutate domain aggregates and it leaves exception classification to the
/// surrounding foundation layer.
/// </para>
/// </remarks>
public sealed class AzureDocumentIntelligenceBroker : IDocumentIntelligenceBroker
{
  private const string ReceiptModelIdentifier = "prebuilt-receipt";
  private readonly DocumentIntelligenceClient client;

  /// <summary>
  /// Initializes the production broker from application configuration.
  /// </summary>
  /// <param name="optionsManager">The application-options provider containing endpoint credentials.</param>
  public AzureDocumentIntelligenceBroker(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);

    ApplicationOptions options = optionsManager.GetApplicationOptions();

    client = new DocumentIntelligenceClient(
      endpoint: new Uri(options.CognitiveServicesEndpoint),
      credential: new AzureKeyCredential(options.CognitiveServicesKey),
      options: new DocumentIntelligenceClientOptions
      {
        Retry =
        {
          MaxRetries = 2,
          Mode = RetryMode.Exponential,
          NetworkTimeout = TimeSpan.FromMinutes(5),
        },
      });
  }

  /// <summary>
  /// Initializes the broker with an existing SDK client for deterministic Broker-boundary tests.
  /// </summary>
  /// <param name="client">The Document Intelligence client to invoke.</param>
  internal AzureDocumentIntelligenceBroker(DocumentIntelligenceClient client) =>
    this.client = client ?? throw new ArgumentNullException(nameof(client));

  /// <inheritdoc/>
  public async ValueTask<ReceiptDocument> AnalyzeReceiptAsync(
    Uri scanLocation,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scanLocation);

    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeReceiptAsync));
    activity?.SetTag("receipt.scan.source_kind", "uri");

    Operation<AnalyzeResult> operation = await client
      .AnalyzeDocumentAsync(
        WaitUntil.Completed,
        ReceiptModelIdentifier,
        scanLocation,
        cancellationToken)
      .ConfigureAwait(false);

    AnalyzeResult result = operation.Value;

    if (result.Documents.Count == 0)
    {
      throw new InvalidStructuredOutputException(
        "Azure Document Intelligence returned no analyzed documents for the receipt scan.");
    }

    AnalyzedDocument analyzedDocument = result.Documents[0];

    return MapReceiptDocument(analyzedDocument);
  }

  internal static ReceiptDocument MapReceiptDocument(AnalyzedDocument analyzedDocument)
  {
    ArgumentNullException.ThrowIfNull(analyzedDocument);

    IReadOnlyDictionary<string, DocumentField> fields = analyzedDocument.Fields;

    return new ReceiptDocument(
      merchant: new ReceiptMerchantDocument(
        Name: ReadString(fields, "MerchantName"),
        Address: ReadString(fields, "MerchantAddress"),
        PhoneNumber: ReadString(fields, "MerchantPhoneNumber")),
      products: MapProducts(fields),
      payment: new ReceiptPaymentDocument(
        TransactionDate: ReadTransactionDate(fields),
        Currency: ReadCurrency(
          fields,
          "Total",
          "InvoiceTotal",
          "Subtotal",
          "SubTotal",
          "TotalTax",
          "Tip"),
        TotalAmount: ReadDecimal(fields, "Total", "InvoiceTotal"),
        TotalTaxAmount: ReadDecimal(fields, "TotalTax", "Tax"),
        SubtotalAmount: ReadDecimal(fields, "Subtotal", "SubTotal"),
        TipAmount: ReadDecimal(fields, "Tip")),
      receiptType: ReadString(fields, "ReceiptType"),
      countryRegion: ReadCountryRegion(fields, "CountryRegion"),
      taxDetails: MapTaxDetails(fields),
      payments: MapPayments(fields));
  }

  private static List<ReceiptProductDocument> MapProducts(IReadOnlyDictionary<string, DocumentField> fields)
  {
    if (!fields.TryGetValue("Items", out DocumentField? itemsField)
        || itemsField.FieldType != DocumentFieldType.List
        || itemsField.ValueList is null)
    {
      return [];
    }

    var products = new List<ReceiptProductDocument>();

    foreach (DocumentField itemField in itemsField.ValueList)
    {
      if (itemField.FieldType != DocumentFieldType.Dictionary
          || itemField.ValueDictionary is null)
      {
        continue;
      }

      IReadOnlyDictionary<string, DocumentField> itemFields = itemField.ValueDictionary;

      products.Add(
        new ReceiptProductDocument(
          Name: ReadString(itemFields, "Description", "Name"),
          Quantity: ReadDecimal(itemFields, "Quantity"),
          QuantityUnit: ReadString(itemFields, "QuantityUnit", "Unit"),
          ProductCode: ReadString(itemFields, "ProductCode"),
          Price: ReadDecimal(itemFields, "Price", "UnitPrice", "Amount"),
          TotalPrice: ReadDecimal(itemFields, "TotalPrice"),
          Confidence: ReadConfidence(itemField)));
    }

    return products;
  }

  private static List<ReceiptTaxDocument> MapTaxDetails(IReadOnlyDictionary<string, DocumentField> fields)
  {
    if (!fields.TryGetValue("TaxDetails", out DocumentField? taxDetailsField)
        || taxDetailsField.FieldType != DocumentFieldType.List
        || taxDetailsField.ValueList is null)
    {
      return [];
    }

    var taxDetails = new List<ReceiptTaxDocument>();

    foreach (DocumentField taxField in taxDetailsField.ValueList)
    {
      if (taxField.FieldType != DocumentFieldType.Dictionary
          || taxField.ValueDictionary is null)
      {
        continue;
      }

      IReadOnlyDictionary<string, DocumentField> taxFields = taxField.ValueDictionary;

      taxDetails.Add(
        new ReceiptTaxDocument(
          Amount: ReadDecimal(taxFields, "Amount"),
          Rate: ReadDecimal(taxFields, "Rate"),
          NetAmount: ReadDecimal(taxFields, "NetAmount"),
          Description: ReadString(taxFields, "Description"),
          Confidence: ReadConfidence(taxField)));
    }

    return taxDetails;
  }

  private static List<ReceiptPaymentLineDocument> MapPayments(IReadOnlyDictionary<string, DocumentField> fields)
  {
    if (!fields.TryGetValue("Payments", out DocumentField? paymentsField)
        || paymentsField.FieldType != DocumentFieldType.List
        || paymentsField.ValueList is null)
    {
      return [];
    }

    var payments = new List<ReceiptPaymentLineDocument>();

    foreach (DocumentField paymentField in paymentsField.ValueList)
    {
      if (paymentField.FieldType != DocumentFieldType.Dictionary
          || paymentField.ValueDictionary is null)
      {
        continue;
      }

      IReadOnlyDictionary<string, DocumentField> paymentFields = paymentField.ValueDictionary;

      payments.Add(
        new ReceiptPaymentLineDocument(
          Method: ReadString(paymentFields, "Method", "PaymentMethod"),
          Amount: ReadDecimal(paymentFields, "Amount"),
          Confidence: ReadConfidence(paymentField)));
    }

    return payments;
  }

  private static DocumentValue<string> ReadString(IReadOnlyDictionary<string, DocumentField> fields, params string[] fieldNames)
  {
    foreach (string fieldName in fieldNames)
    {
      if (!fields.TryGetValue(fieldName, out DocumentField? field))
      {
        continue;
      }

      if (TryReadSupportedString(field, out string? value))
      {
        return new DocumentValue<string>(value, ReadConfidence(field), sourceScanIndex: -1);
      }
    }

    return new DocumentValue<string>(string.Empty, confidence: 0.0, sourceScanIndex: -1);
  }

  private static bool TryReadSupportedString(DocumentField field, out string? value)
  {
    if (field.FieldType == DocumentFieldType.String)
    {
      value = field.ValueString ?? field.Content;
      return value is not null;
    }

    if (field.FieldType == DocumentFieldType.PhoneNumber)
    {
      value = field.ValuePhoneNumber ?? field.Content;
      return value is not null;
    }

    if (field.FieldType == DocumentFieldType.CountryRegion)
    {
      value = field.ValueCountryRegion ?? field.Content;
      return value is not null;
    }

    value = null;
    return false;
  }

  private static DocumentValue<string> ReadCountryRegion(IReadOnlyDictionary<string, DocumentField> fields, params string[] fieldNames) =>
    ReadString(fields, fieldNames);

  private static DocumentValue<decimal?> ReadDecimal(IReadOnlyDictionary<string, DocumentField> fields, params string[] fieldNames)
  {
    foreach (string fieldName in fieldNames)
    {
      if (!fields.TryGetValue(fieldName, out DocumentField? field))
      {
        continue;
      }

      decimal? value = null;

      if (field.FieldType == DocumentFieldType.Double && field.ValueDouble is double doubleValue)
      {
        value = (decimal)doubleValue;
      }
      else if (field.FieldType == DocumentFieldType.Int64 && field.ValueInt64 is long longValue)
      {
        value = longValue;
      }
      else if (field.FieldType == DocumentFieldType.Currency && field.ValueCurrency is not null)
      {
        value = (decimal)field.ValueCurrency.Amount;
      }

      if (value.HasValue)
      {
        return new DocumentValue<decimal?>(value.Value, ReadConfidence(field), sourceScanIndex: -1);
      }
    }

    return new DocumentValue<decimal?>(null, confidence: 0.0, sourceScanIndex: -1);
  }

  private static DocumentValue<Currency?> ReadCurrency(IReadOnlyDictionary<string, DocumentField> fields, params string[] fieldNames)
  {
    foreach (string fieldName in fieldNames)
    {
      if (!fields.TryGetValue(fieldName, out DocumentField? field)
          || field.FieldType != DocumentFieldType.Currency
          || field.ValueCurrency is null)
      {
        continue;
      }

      CurrencyValue currencyValue = field.ValueCurrency;
      var currency = new Currency(
        Name: currencyValue.CurrencyCode ?? string.Empty,
        Code: currencyValue.CurrencyCode ?? string.Empty,
        Symbol: currencyValue.CurrencySymbol ?? string.Empty);

      return new DocumentValue<Currency?>(currency, ReadConfidence(field), sourceScanIndex: -1);
    }

    return new DocumentValue<Currency?>(null, confidence: 0.0, sourceScanIndex: -1);
  }

  private static DocumentValue<DateTimeOffset?> ReadTransactionDate(IReadOnlyDictionary<string, DocumentField> fields)
  {
    if (!fields.TryGetValue("TransactionDate", out DocumentField? dateField)
        || dateField.FieldType != DocumentFieldType.Date
        || dateField.ValueDate is null)
    {
      return new DocumentValue<DateTimeOffset?>(null, confidence: 0.0, sourceScanIndex: -1);
    }

    DateTimeOffset transactionDate = dateField.ValueDate.Value;
    double confidence = ReadConfidence(dateField);

    if (fields.TryGetValue("TransactionTime", out DocumentField? timeField))
    {
      TimeSpan? transactionTime = ReadTime(timeField);

      if (transactionTime.HasValue)
      {
        transactionDate = transactionDate.Add(transactionTime.Value);
        confidence = Math.Max(confidence, ReadConfidence(timeField));
      }
    }

    return new DocumentValue<DateTimeOffset?>(transactionDate, confidence, sourceScanIndex: -1);
  }

  private static TimeSpan? ReadTime(DocumentField timeField)
  {
    if (timeField.FieldType == DocumentFieldType.Time)
    {
      return timeField.ValueTime;
    }

    if (string.IsNullOrWhiteSpace(timeField.Content))
    {
      return null;
    }

    var digits = timeField.Content.Where(char.IsDigit).ToArray();

    return digits.Length switch
    {
      4 => ParseTimeFromDigits(digits, hasSeconds: false),
      6 => ParseTimeFromDigits(digits, hasSeconds: true),
      _ => null,
    };
  }

  private static TimeSpan? ParseTimeFromDigits(char[] digits, bool hasSeconds)
  {
    int hour = ((digits[0] - '0') * 10) + (digits[1] - '0');
    int minute = ((digits[2] - '0') * 10) + (digits[3] - '0');
    int second = hasSeconds
      ? ((digits[4] - '0') * 10) + (digits[5] - '0')
      : 0;

    return hour is > 23
      || minute is > 59
      || second is > 59
        ? null
        : new TimeSpan(hour, minute, second);
  }

  private static double ReadConfidence(DocumentField field) =>
    field.Confidence is float confidence ? confidence : 0.0;
}
