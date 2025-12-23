namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using Azure.AI.FormRecognizer.DocumentAnalysis;

public sealed partial class AzureFormRecognizerBroker
{
  internal static Merchant IdentifyMerchant(AnalyzedDocument photo)
  {
    ArgumentNullException.ThrowIfNull(photo);

    var photoFields = photo.Fields;
    var merchant = new Merchant() { CreatedAt = DateTime.UtcNow };

    // Step 1. Extract the merchant name from the analyzed document.
    if (photoFields.TryGetValue("MerchantName", out var merchantNameField)
      && merchantNameField.FieldType is DocumentFieldType.String)
    {
      merchant.Name = merchantNameField.Value.AsString();
    }

    // Step 2. Extract the merchant address from the analyzed document.
    if (photoFields.TryGetValue("MerchantAddress", out var merchantAddressField))
    {
      if (merchantAddressField.FieldType is DocumentFieldType.String)
      {
        merchant.Address = merchant.Address with
        {
          Address = merchantAddressField.Value.AsString()
        };
      }
      else if (merchantAddressField.FieldType is DocumentFieldType.Address)
      {
        merchant.Address = merchant.Address with
        {
          Address = merchantAddressField.Content
        };
      }
    }


    // Step 3. Extract the merchant phone number from the analyzed document.
    if (photoFields.TryGetValue("MerchantPhoneNumber", out var merchantPhoneNumberField)
      && (merchantPhoneNumberField.FieldType is DocumentFieldType.PhoneNumber
        || merchantPhoneNumberField.FieldType is DocumentFieldType.String))
    {
      merchant.Address = merchant.Address with
      {
        PhoneNumber = merchantPhoneNumberField.Value.AsPhoneNumber()
      };
    }

    return merchant;
  }

  internal static PaymentInformation IdentifyPaymentInformation(AnalyzedDocument photo)
  {
    ArgumentNullException.ThrowIfNull(photo);
    var photoFields = photo.Fields;
    var paymentInformation = new PaymentInformation
    {
      // Step 1. Extract the transaction datetime from the analyzed document.
      TransactionDate = ExtractTransactionDateTime(photoFields),

      // Step 2. Extract the total amount from the analyzed document.
      TotalCostAmount = ExtractTotalAmount(photoFields),

      // Step 3. Extract the total tax amount from the analyzed document.
      TotalTaxAmount = ExtractTotalTax(photoFields)
    };

    // Step 4. Extract currency information from the document if available.
    var (currency, currencyAmount) = ExtractCurrencyInformation(photoFields);
    if (currency.HasValue)
    {
      paymentInformation.Currency = currency.Value;
      if (paymentInformation.TotalCostAmount == 0.0m && currencyAmount > 0)
      {
        paymentInformation.TotalCostAmount = currencyAmount;
      }
    }

    return paymentInformation;
  }

  /// <summary>
  /// Extracts the transaction date and time from document fields.
  /// </summary>
  /// <param name="photoFields">The document fields from OCR analysis.</param>
  /// <returns>The extracted transaction datetime, or current time if not found.</returns>
  private static DateTimeOffset ExtractTransactionDateTime(IReadOnlyDictionary<string, DocumentField> photoFields)
  {
    if (!photoFields.TryGetValue("TransactionDate", out var transactionDateField)
        || transactionDateField.FieldType is not DocumentFieldType.Date)
    {
      return DateTimeOffset.Now;
    }

    var transactionDate = transactionDateField.Value.AsDate();

    if (!photoFields.TryGetValue("TransactionTime", out var transactionTimeField))
    {
      return transactionDate;
    }

    var timeSpan = ExtractTimeSpan(transactionTimeField);
    return transactionDate.Add(timeSpan);
  }

  /// <summary>
  /// Extracts a TimeSpan from a transaction time field, handling various field types.
  /// </summary>
  /// <param name="transactionTimeField">The transaction time field from OCR.</param>
  /// <returns>The extracted TimeSpan, or TimeSpan.Zero if parsing fails.</returns>
  private static TimeSpan ExtractTimeSpan(DocumentField transactionTimeField)
  {
    if (transactionTimeField.FieldType is DocumentFieldType.Time)
    {
      return transactionTimeField.Value.AsTime();
    }

    if (transactionTimeField.FieldType is not DocumentFieldType.Unknown)
    {
      return TimeSpan.Zero;
    }

    // Fallback: parse time from raw content when field type is not recognized.
    var fieldValue = transactionTimeField.Content;
    var digits = fieldValue.Where(char.IsDigit).ToArray();

    return digits.Length switch
    {
      4 => ParseTimeFromDigits(digits, hasSeconds: false),
      6 => ParseTimeFromDigits(digits, hasSeconds: true),
      _ => TimeSpan.Zero
    };
  }

  /// <summary>
  /// Parses a TimeSpan from an array of digit characters.
  /// </summary>
  /// <param name="digits">Array of digit characters (HHMM or HHMMSS format).</param>
  /// <param name="hasSeconds">Whether the digits include seconds.</param>
  /// <returns>The parsed TimeSpan.</returns>
  private static TimeSpan ParseTimeFromDigits(char[] digits, bool hasSeconds)
  {
    var hour = int.Parse($"{digits[0]}{digits[1]}", NumberStyles.Integer, CultureInfo.InvariantCulture);
    var minute = int.Parse($"{digits[2]}{digits[3]}", NumberStyles.Integer, CultureInfo.InvariantCulture);
    var second = hasSeconds ? int.Parse($"{digits[4]}{digits[5]}", NumberStyles.Integer, CultureInfo.InvariantCulture) : 0;
    return new TimeSpan(hour, minute, second);
  }

  /// <summary>
  /// Extracts the total amount from document fields.
  /// </summary>
  /// <param name="photoFields">The document fields from OCR analysis.</param>
  /// <returns>The extracted total amount, or 0 if not found.</returns>
  private static decimal ExtractTotalAmount(IReadOnlyDictionary<string, DocumentField> photoFields) => photoFields.TryGetValue("Total", out var totalField)
        && totalField.FieldType is DocumentFieldType.Double
      ? (decimal)totalField.Value.AsDouble()
      : 0m;

  /// <summary>
  /// Extracts the total tax amount from document fields.
  /// </summary>
  /// <param name="photoFields">The document fields from OCR analysis.</param>
  /// <returns>The extracted tax amount, or 0 if not found.</returns>
  private static decimal ExtractTotalTax(IReadOnlyDictionary<string, DocumentField> photoFields) => photoFields.TryGetValue("TotalTax", out var taxField)
        && taxField.FieldType is DocumentFieldType.Double
      ? (decimal)taxField.Value.AsDouble()
      : 0m;

  /// <summary>
  /// Extracts currency information from document fields.
  /// </summary>
  /// <param name="photoFields">The document fields from OCR analysis.</param>
  /// <returns>A tuple of the extracted Currency (or null) and the amount.</returns>
  private static (Currency? Currency, decimal Amount) ExtractCurrencyInformation(IReadOnlyDictionary<string, DocumentField> photoFields)
  {
    if (!photoFields.TryGetValue("Total", out var currencySourceField)
        || currencySourceField.FieldType is not DocumentFieldType.Currency)
    {
      return (null, 0m);
    }

    CurrencyValue currencyValue = currencySourceField.Value.AsCurrency();
    Currency currencyObject = new Currency
    {
      Code = currencyValue.Code,
      Name = currencyValue.Code,
      Symbol = currencyValue.Symbol
    };

    return (currencyObject, (decimal)currencyValue.Amount);
  }

  internal static ICollection<Product> IdentifyProducts(AnalyzedDocument photo)
  {
    ArgumentNullException.ThrowIfNull(photo);
    var photoFields = photo.Fields;
    var products = new List<Product>();

    // Iterate over the document fields and work only with products.
    // The prebuilt-receipt model returns items as a list of dictionaries with fields:
    // Description (string), Quantity (double), Price (double/currency), TotalPrice (double/currency)
    if (photoFields.TryGetValue("Items", out var itemsList)
        && itemsList.FieldType is DocumentFieldType.List)
    {
      foreach (var item in itemsList.Value.AsList()
          .Where(item => item.FieldType is DocumentFieldType.Dictionary))
      {
        var itemFields = item.Value.AsDictionary();
        var product = ExtractProductFromItemFields(itemFields);
        products.Add(product);
      }
    }

    return products;
  }

  /// <summary>
  /// Extracts a single product from the item dictionary fields.
  /// </summary>
  /// <param name="itemFields">Dictionary of item fields from the prebuilt-receipt model.</param>
  /// <returns>A populated Product instance with extracted field values.</returns>
  private static Product ExtractProductFromItemFields(IReadOnlyDictionary<string, DocumentField> itemFields)
  {
    var product = new Product();

    // Step 1. Extract the raw name of the product (Description field in v4.0).
    if (itemFields.TryGetValue("Description", out var nameField)
                  && nameField.FieldType is DocumentFieldType.String)
    {
      product.RawName = nameField.Value.AsString();
    }

    // Step 2. Extract the unit price of the product.
    product.Price = ExtractMonetaryValue(itemFields, "Price");

    // Step 3. Extract the quantity of the product.
    if (itemFields.TryGetValue("Quantity", out var quantityField)
        && quantityField.FieldType is DocumentFieldType.Double)
    {
      product.Quantity = (decimal)quantityField.Value.AsDouble();
    }

    // Step 4. Extract the quantity unit, if available.
    if (itemFields.TryGetValue("QuantityUnit", out var quantityUnitField)
                  && quantityUnitField.FieldType is DocumentFieldType.String)
    {
      product.QuantityUnit = quantityUnitField.Value.AsString();
    }

    // Step 5. Extract the total price for this line item (Quantity * Price).
    // Note: TotalPrice is a computed property on Product, but we can validate OCR extraction.
    // The prebuilt-receipt model provides TotalPrice as a separate field which may differ
    // from computed value due to discounts or rounding. We prefer the OCR value when available.
    var extractedTotalPrice = ExtractMonetaryValue(itemFields, "TotalPrice");
    if (extractedTotalPrice > 0 && product.Quantity == 0 && product.Price > 0)
    {
      // If quantity is missing but we have TotalPrice and unit Price, derive quantity.
      product.Quantity = extractedTotalPrice / product.Price;
    }
    else if (extractedTotalPrice > 0 && product.Price == 0 && product.Quantity > 0)
    {
      // If unit price is missing but we have TotalPrice and Quantity, derive price.
      product.Price = extractedTotalPrice / product.Quantity;
    }

    return product;
  }

  /// <summary>
  /// Extracts a monetary value from item fields, handling both Double and Currency field types.
  /// </summary>
  /// <param name="itemFields">Dictionary of item fields.</param>
  /// <param name="fieldName">Name of the field to extract.</param>
  /// <returns>The extracted decimal value, or 0 if not found.</returns>
  private static decimal ExtractMonetaryValue(IReadOnlyDictionary<string, DocumentField> itemFields, string fieldName) => !itemFields.TryGetValue(fieldName, out var field)
      ? 0m
      : field.FieldType switch
      {
        DocumentFieldType.Double => (decimal)field.Value.AsDouble(),
        DocumentFieldType.Currency => (decimal)field.Value.AsCurrency().Amount,
        _ => 0m
      };
}
