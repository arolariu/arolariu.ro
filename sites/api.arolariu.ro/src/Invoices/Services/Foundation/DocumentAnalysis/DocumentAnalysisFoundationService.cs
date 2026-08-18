namespace arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.Extensions.Logging;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Extracts and deterministically merges typed receipt data across all scans of an invoice.
/// </summary>
public sealed partial class DocumentAnalysisFoundationService : IDocumentAnalysisFoundationService
{
  private readonly IDocumentIntelligenceBroker documentIntelligenceBroker;
  private readonly IInvoiceBlobStorageBroker invoiceBlobStorageBroker;
  private readonly ILogger<IDocumentAnalysisFoundationService> logger;
  private readonly IOptionsManager optionsManager;

  /// <summary>
  /// Initializes a new instance of the <see cref="DocumentAnalysisFoundationService"/> class.
  /// </summary>
  /// <param name="documentIntelligenceBroker">The provider-neutral document-intelligence broker.</param>
  /// <param name="invoiceBlobStorageBroker">
  /// The backend credential-backed Blob Storage broker used to validate every approved scan before analysis.
  /// </param>
  /// <param name="loggerFactory">The logger factory used to create the service logger.</param>
  /// <param name="optionsManager">The storage configuration used to approve scan locations before provider calls.</param>
  public DocumentAnalysisFoundationService(
    IDocumentIntelligenceBroker documentIntelligenceBroker,
    IInvoiceBlobStorageBroker invoiceBlobStorageBroker,
    ILoggerFactory loggerFactory,
    IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(documentIntelligenceBroker);
    ArgumentNullException.ThrowIfNull(invoiceBlobStorageBroker);
    ArgumentNullException.ThrowIfNull(loggerFactory);
    ArgumentNullException.ThrowIfNull(optionsManager);

    this.documentIntelligenceBroker = documentIntelligenceBroker;
    this.invoiceBlobStorageBroker = invoiceBlobStorageBroker;
    logger = loggerFactory.CreateLogger<IDocumentAnalysisFoundationService>();
    this.optionsManager = optionsManager;
  }

  /// <summary>
  /// Initializes a test-only instance for deterministic receipt-mapping tests.
  /// </summary>
  /// <remarks>
  /// This internal constructor is available only to the Invoices test assembly. Production composition must use the
  /// public constructor so server-side Blob Storage property validation cannot be bypassed.
  /// </remarks>
  /// <param name="documentIntelligenceBroker">The scripted document-intelligence broker used by the unit test.</param>
  /// <param name="loggerFactory">The logger factory used by the unit test.</param>
  /// <param name="optionsManager">The deterministic storage options used by the unit test.</param>
  internal DocumentAnalysisFoundationService(
    IDocumentIntelligenceBroker documentIntelligenceBroker,
    ILoggerFactory loggerFactory,
    IOptionsManager optionsManager)
    : this(
      documentIntelligenceBroker,
      new DeterministicTestBlobStorageBroker(),
      loggerFactory,
      optionsManager)
  {
  }

  /// <inheritdoc/>
  public async Task<ReceiptExtractionResult> ExtractInvoiceAsync(
    IReadOnlyList<InvoiceScan> scans,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      async () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ExtractInvoiceAsync));
        ValidateScansAreSet(scans);
        ApplicationOptions storageOptions = optionsManager.GetApplicationOptions();

        var extractionTasks = new Task<IndexedReceiptDocument>[scans.Count];

        for (int index = 0; index < scans.Count; index++)
        {
          InvoiceScan scan = scans[index];
          ValidateScanIsUsable(scan, index, storageOptions);
          await ValidateScanBlobPropertiesAsync(scan, storageOptions, cancellationToken).ConfigureAwait(false);
        }

        for (int index = 0; index < scans.Count; index++)
        {
          InvoiceScan scan = scans[index];
          extractionTasks[index] = AnalyzeScanAsync(scan, index, cancellationToken);
        }

        IndexedReceiptDocument[] extractedDocuments = await Task
          .WhenAll(extractionTasks)
          .ConfigureAwait(false);

        Array.Sort(extractedDocuments, static (left, right) => left.Index.CompareTo(right.Index));

        return MergeDocuments(extractedDocuments);
      },
      cancellationToken)
      .ConfigureAwait(false);

  private async Task<IndexedReceiptDocument> AnalyzeScanAsync(
    InvoiceScan scan,
    int index,
    CancellationToken cancellationToken)
  {
    ReceiptDocument receiptDocument = await documentIntelligenceBroker
      .AnalyzeReceiptAsync(scan.Location, cancellationToken)
      .ConfigureAwait(false);

    ValidateReceiptDocumentIsSet(receiptDocument);

    return new IndexedReceiptDocument(index, receiptDocument.WithSourceScanIndex(index));
  }

  private async Task ValidateScanBlobPropertiesAsync(
    InvoiceScan scan,
    ApplicationOptions storageOptions,
    CancellationToken cancellationToken)
  {
    if (!InvoiceScanStorageLocationPolicy.TryResolveApprovedBlobPath(
      scan.Location,
      storageOptions,
      out string blobPath,
      out string validationMessage))
    {
      throw new InvoiceScanBlobValidationException(validationMessage);
    }

    InvoiceScanBlobProperties properties;

    try
    {
      properties = await invoiceBlobStorageBroker
        .GetPropertiesAsync(blobPath, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (Azure.RequestFailedException exception) when (exception.Status == 404)
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan was not found in approved storage.",
        exception);
    }
    catch (Exception exception)
      when (exception is Azure.RequestFailedException or System.Net.Http.HttpRequestException or TimeoutException)
    {
      throw new InvoiceScanBlobDependencyException(
        "The uploaded scan could not be inspected in storage.",
        exception);
    }

    if (properties.ContentLength is < 0 or > (10L * 1024L * 1024L))
    {
      throw new InvoiceScanBlobValidationException("The uploaded scan must not exceed 10 MiB.");
    }

    if (!properties.IsBlockBlob)
    {
      throw new InvoiceScanBlobValidationException("The uploaded scan must be stored as a block blob.");
    }

    if (!HasExpectedContentType(scan.Type, properties.ContentType))
    {
      throw new InvoiceScanBlobValidationException(
        "The uploaded scan content type does not match the selected scan type.");
    }
  }

  private static bool HasExpectedContentType(ScanType scanType, string? contentType)
  {
    if (string.IsNullOrWhiteSpace(contentType))
    {
      return true;
    }

    string normalizedContentType = contentType
      .Split(';', 2, StringSplitOptions.TrimEntries)[0];

    if (string.Equals(normalizedContentType, "application/octet-stream", StringComparison.OrdinalIgnoreCase))
    {
      return true;
    }

    return scanType switch
    {
      ScanType.JPG or ScanType.JPEG
        => string.Equals(normalizedContentType, "image/jpeg", StringComparison.OrdinalIgnoreCase),
      ScanType.PNG
        => string.Equals(normalizedContentType, "image/png", StringComparison.OrdinalIgnoreCase),
      ScanType.PDF
        => string.Equals(normalizedContentType, "application/pdf", StringComparison.OrdinalIgnoreCase),
      ScanType.BMP
        => string.Equals(normalizedContentType, "image/bmp", StringComparison.OrdinalIgnoreCase),
      ScanType.TIFF
        => string.Equals(normalizedContentType, "image/tiff", StringComparison.OrdinalIgnoreCase),
      ScanType.HEIF
        => string.Equals(normalizedContentType, "image/heif", StringComparison.OrdinalIgnoreCase)
          || string.Equals(normalizedContentType, "image/heic", StringComparison.OrdinalIgnoreCase),
      _ => false,
    };
  }

  private static ReceiptExtractionResult MergeDocuments(IReadOnlyList<IndexedReceiptDocument> extractedDocuments)
  {
    MerchantCandidate? merchantCandidate = null;
    var products = new List<ExtractedProduct>();
    var productKeys = new HashSet<ProductIdentity>();
    var taxDetails = new List<TaxDetail>();
    var taxKeys = new HashSet<TaxIdentity>();
    var payments = new List<PaymentDetail>();
    var paymentKeys = new HashSet<PaymentIdentity>();

    string receiptType = string.Empty;
    string countryRegion = string.Empty;
    DateTimeOffset? transactionDate = null;
    Currency? currency = null;
    decimal? totalAmount = null;
    decimal? totalTaxAmount = null;
    decimal? subtotalAmount = null;
    decimal? tipAmount = null;

    foreach (IndexedReceiptDocument extractedDocument in extractedDocuments)
    {
      ReceiptDocument document = extractedDocument.Document;

      merchantCandidate ??= TryCreateMerchantCandidate(document.Merchant);
      receiptType = ChooseFirstNonEmpty(receiptType, document.ReceiptType.Value);
      countryRegion = ChooseFirstNonEmpty(countryRegion, document.CountryRegion.Value);
      transactionDate ??= document.Payment.TransactionDate.Value;
      currency ??= document.Payment.Currency.Value;
      totalAmount ??= document.Payment.TotalAmount.Value;
      totalTaxAmount ??= document.Payment.TotalTaxAmount.Value;
      subtotalAmount ??= document.Payment.SubtotalAmount.Value;
      tipAmount ??= document.Payment.TipAmount.Value;

      MergeProducts(document.Products, products, productKeys);
      MergeTaxDetails(document.TaxDetails, taxDetails, taxKeys);
      MergePayments(document.Payments, payments, paymentKeys);
    }

    PaymentInformation paymentInformation = BuildPaymentInformation(
      transactionDate,
      currency,
      totalAmount,
      totalTaxAmount,
      subtotalAmount,
      tipAmount,
      payments);

    return new ReceiptExtractionResult(
      merchantCandidate,
      products,
      paymentInformation,
      receiptType,
      countryRegion,
      taxDetails,
      payments);
  }

  private static void MergeProducts(
    IReadOnlyList<ReceiptProductDocument> productDocuments,
    List<ExtractedProduct> mergedProducts,
    ISet<ProductIdentity> productKeys)
  {
    foreach (ReceiptProductDocument productDocument in productDocuments)
    {
      if (!TryCreateProduct(productDocument, out ExtractedProduct? product, out ProductIdentity identity))
      {
        continue;
      }

      if (productKeys.Add(identity))
      {
        mergedProducts.Add(product!);
      }
    }
  }

  private static void MergeTaxDetails(
    IReadOnlyList<ReceiptTaxDocument> taxDocuments,
    List<TaxDetail> mergedTaxDetails,
    ISet<TaxIdentity> taxKeys)
  {
    foreach (ReceiptTaxDocument taxDocument in taxDocuments)
    {
      string description = NormalizeOptionalText(taxDocument.Description.Value);
      decimal amount = taxDocument.Amount.Value ?? 0.0m;
      decimal rate = taxDocument.Rate.Value ?? 0.0m;
      decimal netAmount = taxDocument.NetAmount.Value ?? 0.0m;

      if (string.IsNullOrEmpty(description) && amount == 0.0m && rate == 0.0m && netAmount == 0.0m)
      {
        continue;
      }

      var identity = new TaxIdentity(description.ToUpperInvariant(), amount, rate, netAmount);

      if (!taxKeys.Add(identity))
      {
        continue;
      }

      mergedTaxDetails.Add(
        new TaxDetail
        {
          Description = description,
          Amount = amount,
          Rate = rate,
          NetAmount = netAmount,
        });
    }
  }

  private static void MergePayments(
    IReadOnlyList<ReceiptPaymentLineDocument> paymentDocuments,
    List<PaymentDetail> mergedPayments,
    ISet<PaymentIdentity> paymentKeys)
  {
    foreach (ReceiptPaymentLineDocument paymentDocument in paymentDocuments)
    {
      string method = NormalizeOptionalText(paymentDocument.Method.Value);
      decimal amount = paymentDocument.Amount.Value ?? 0.0m;

      if (string.IsNullOrEmpty(method) && amount == 0.0m)
      {
        continue;
      }

      var identity = new PaymentIdentity(method.ToUpperInvariant(), amount);

      if (!paymentKeys.Add(identity))
      {
        continue;
      }

      mergedPayments.Add(
        new PaymentDetail
        {
          Method = method,
          Amount = amount,
        });
    }
  }

  private static MerchantCandidate? TryCreateMerchantCandidate(ReceiptMerchantDocument merchant)
  {
    string name = NormalizeOptionalText(merchant.Name.Value);
    string address = NormalizeOptionalText(merchant.Address.Value);
    string phoneNumber = NormalizeOptionalText(merchant.PhoneNumber.Value);

    if (string.IsNullOrEmpty(name)
        && string.IsNullOrEmpty(address)
        && string.IsNullOrEmpty(phoneNumber))
    {
      return null;
    }

    return new MerchantCandidate(
      name,
      address,
      phoneNumber,
      merchant.Name.Confidence,
      merchant.Address.Confidence,
      merchant.PhoneNumber.Confidence);
  }

  private static bool TryCreateProduct(
    ReceiptProductDocument productDocument,
    out ExtractedProduct? product,
    out ProductIdentity identity)
  {
    product = null;
    identity = default;

    string name = NormalizeOptionalText(productDocument.Name.Value);

    if (string.IsNullOrEmpty(name))
    {
      return false;
    }

    string quantityUnit = NormalizeOptionalText(productDocument.QuantityUnit.Value);
    string productCode = NormalizeOptionalText(productDocument.ProductCode.Value);
    decimal quantity = productDocument.Quantity.Value ?? 0.0m;
    decimal price = productDocument.Price.Value ?? 0.0m;
    decimal? totalPrice = productDocument.TotalPrice.Value;

    if (quantity < 0.0m || price < 0.0m || (totalPrice.HasValue && totalPrice.Value < 0.0m))
    {
      return false;
    }

    if (quantity == 0.0m
        && price > 0.0m
        && totalPrice is > 0.0m
        && TryDerivePositiveComponent(totalPrice.Value, price, out decimal derivedQuantity))
    {
      quantity = derivedQuantity;
    }
    else if (price == 0.0m
             && quantity > 0.0m
             && totalPrice is > 0.0m
             && TryDerivePositiveComponent(totalPrice.Value, quantity, out decimal derivedPrice))
    {
      price = derivedPrice;
    }

    if (quantity < 0.0m || price < 0.0m)
    {
      return false;
    }

    double confidence = productDocument.Confidence > 0.0
      ? productDocument.Confidence
      : MaxConfidence(
        productDocument.Name.Confidence,
        productDocument.Quantity.Confidence,
        productDocument.QuantityUnit.Confidence,
        productDocument.ProductCode.Confidence,
        productDocument.Price.Confidence,
        productDocument.TotalPrice.Confidence);

    product = new ExtractedProduct(name, quantity, quantityUnit, productCode, price, confidence);
    identity = new ProductIdentity(name.ToUpperInvariant(), productCode.ToUpperInvariant(), quantity, price);
    return true;
  }

  private static PaymentInformation BuildPaymentInformation(
    DateTimeOffset? transactionDate,
    Currency? currency,
    decimal? totalAmount,
    decimal? totalTaxAmount,
    decimal? subtotalAmount,
    decimal? tipAmount,
    IReadOnlyList<PaymentDetail> payments)
  {
    return new PaymentInformation
    {
      TransactionDate = transactionDate ?? default,
      Currency = currency ?? default,
      TotalCostAmount = totalAmount ?? 0.0m,
      TotalTaxAmount = totalTaxAmount ?? 0.0m,
      SubtotalAmount = subtotalAmount ?? 0.0m,
      TipAmount = tipAmount ?? 0.0m,
      PaymentType = DeterminePaymentType(payments),
    };
  }

  private static PaymentType DeterminePaymentType(IReadOnlyList<PaymentDetail> payments)
  {
    if (payments.Count == 0)
    {
      return PaymentType.UNKNOWN;
    }

    string method = NormalizeOptionalText(payments[0].Method).ToUpperInvariant();

    return method switch
    {
      "CARD" or "CREDIT CARD" or "DEBIT CARD" => PaymentType.CARD,
      "CASH" => PaymentType.CASH,
      "TRANSFER" or "BANK TRANSFER" => PaymentType.TRANSFER,
      "MOBILE" or "MOBILE PAYMENT" or "APPLE PAY" or "GOOGLE PAY" => PaymentType.MOBILEPAYMENT,
      "VOUCHER" or "COUPON" => PaymentType.VOUCHER,
      _ => PaymentType.UNKNOWN,
    };
  }

  private static string ChooseFirstNonEmpty(string currentValue, string? candidateValue) =>
    string.IsNullOrWhiteSpace(currentValue)
      ? NormalizeOptionalText(candidateValue)
      : currentValue;

  private static string NormalizeOptionalText(string? value) =>
    string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

  private static bool TryDerivePositiveComponent(decimal total, decimal divisor, out decimal derivedValue)
  {
    derivedValue = 0.0m;

    if (total <= 0.0m || divisor <= 0.0m)
    {
      return false;
    }

    decimal candidate = total / divisor;

    if (candidate <= 0.0m)
    {
      return false;
    }

    decimal reconstructedTotal = decimal.Round(
      candidate * divisor,
      decimals: 2,
      mode: MidpointRounding.AwayFromZero);

    if (reconstructedTotal != decimal.Round(total, 2, MidpointRounding.AwayFromZero))
    {
      return false;
    }

    derivedValue = candidate;
    return true;
  }

  private static double MaxConfidence(params double[] confidences)
  {
    double maximum = 0.0;

    foreach (double confidence in confidences)
    {
      if (confidence > maximum)
      {
        maximum = confidence;
      }
    }

    return maximum;
  }

  private readonly record struct IndexedReceiptDocument(int Index, ReceiptDocument Document);
  private readonly record struct ProductIdentity(string Name, string ProductCode, decimal Quantity, decimal Price);
  private readonly record struct TaxIdentity(string Description, decimal Amount, decimal Rate, decimal NetAmount);
  private readonly record struct PaymentIdentity(string Method, decimal Amount);

  private sealed class DeterministicTestBlobStorageBroker : IInvoiceBlobStorageBroker
  {
    public Task<InvoiceScanBlobProperties> GetPropertiesAsync(
      string blobPath,
      CancellationToken cancellationToken) =>
      Task.FromResult(new InvoiceScanBlobProperties(1024L, true, ContentType: null));
  }
}
