namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Extended unit tests for the PaymentInformation value object.
/// </summary>
[TestClass]
public sealed class PaymentInformationExtendedTests
{
  #region PaymentInformation Property Tests

  /// <summary>
  /// Validates default PaymentInformation creation.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_DefaultCreation_HasDefaultValues()
  {
    // Arrange & Act
    var payment = new PaymentInformation();

    // Assert
    Assert.AreEqual(PaymentType.UNKNOWN, payment.PaymentType);
    Assert.AreEqual(0.0m, payment.TotalCostAmount);
    Assert.AreEqual(0.0m, payment.TotalTaxAmount);
    Assert.AreNotEqual(default, payment.Currency);
  }

  /// <summary>
  /// Validates TransactionDate property.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SetTransactionDate_StoresValue()
  {
    // Arrange
    var payment = new PaymentInformation();
    var date = new DateTimeOffset(2024, 1, 15, 10, 30, 0, TimeSpan.Zero);

    // Act
    payment.TransactionDate = date;

    // Assert
    Assert.AreEqual(date, payment.TransactionDate);
  }

  /// <summary>
  /// Validates PaymentType property.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SetPaymentType_StoresValue()
  {
    // Arrange
    var payment = new PaymentInformation();

    // Act
    payment.PaymentType = PaymentType.CARD;

    // Assert
    Assert.AreEqual(PaymentType.CARD, payment.PaymentType);
  }

  /// <summary>
  /// Validates TotalCostAmount property.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SetTotalCostAmount_StoresValue()
  {
    // Arrange
    var payment = new PaymentInformation();

    // Act
    payment.TotalCostAmount = 150.99m;

    // Assert
    Assert.AreEqual(150.99m, payment.TotalCostAmount);
  }

  /// <summary>
  /// Validates TotalTaxAmount property.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SetTotalTaxAmount_StoresValue()
  {
    // Arrange
    var payment = new PaymentInformation();

    // Act
    payment.TotalTaxAmount = 28.69m;

    // Assert
    Assert.AreEqual(28.69m, payment.TotalTaxAmount);
  }

  /// <summary>
  /// Validates Currency property.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SetCurrency_StoresValue()
  {
    // Arrange
    var payment = new PaymentInformation();
    var currency = new Currency("Euro", "EUR", "Euro");

    // Act
    payment.Currency = currency;

    // Assert
    Assert.AreEqual("Euro", payment.Currency.Name);
    Assert.AreEqual("EUR", payment.Currency.Code);
  }

  /// <summary>
  /// Validates default Currency is Romanian Leu.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_DefaultCurrency_IsRomanianLeu()
  {
    // Arrange & Act
    var payment = new PaymentInformation();

    // Assert
    Assert.AreEqual("Romanian Leu", payment.Currency.Name);
    Assert.AreEqual("RON", payment.Currency.Code);
  }

  #endregion

  #region PaymentType Enum Tests

  /// <summary>
  /// Validates all PaymentType enum values.
  /// </summary>
  [TestMethod]
  public void PaymentType_AllValues_AreValid()
  {
    // Arrange
    var paymentTypes = Enum.GetValues<PaymentType>();

    // Act & Assert
    foreach (var type in paymentTypes)
    {
      var payment = new PaymentInformation { PaymentType = type };
      Assert.AreEqual(type, payment.PaymentType);
    }
  }

  /// <summary>
  /// Validates PaymentType.UNKNOWN exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_Unknown_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.UNKNOWN));
  }

  /// <summary>
  /// Validates PaymentType.CASH exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_Cash_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.CASH));
  }

  /// <summary>
  /// Validates PaymentType.CARD exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_Card_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.CARD));
  }

  /// <summary>
  /// Validates PaymentType.TRANSFER exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_Transfer_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.TRANSFER));
  }

  /// <summary>
  /// Validates PaymentType.MOBILEPAYMENT exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_MobilePayment_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.MOBILEPAYMENT));
  }

  /// <summary>
  /// Validates PaymentType.VOUCHER exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_Voucher_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.VOUCHER));
  }

  /// <summary>
  /// Validates PaymentType.Other exists.
  /// </summary>
  [TestMethod]
  public void PaymentType_Other_Exists()
  {
    Assert.IsTrue(Enum.IsDefined<PaymentType>(PaymentType.Other));
  }

  /// <summary>
  /// Validates PaymentType enum has expected count.
  /// </summary>
  [TestMethod]
  public void PaymentType_HasExpectedValueCount()
  {
    // Arrange
    var values = Enum.GetValues<PaymentType>();

    // Assert - Should have 7 payment types
    Assert.AreEqual(7, values.Length);
  }

  #endregion

  #region PaymentInformation Edge Cases

  /// <summary>
  /// Validates zero cost amount is allowed.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_ZeroCostAmount_IsAllowed()
  {
    // Arrange & Act
    var payment = new PaymentInformation { TotalCostAmount = 0 };

    // Assert
    Assert.AreEqual(0, payment.TotalCostAmount);
  }

  /// <summary>
  /// Validates large cost amount is allowed.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_LargeCostAmount_IsAllowed()
  {
    // Arrange & Act
    var payment = new PaymentInformation { TotalCostAmount = 999999.99m };

    // Assert
    Assert.AreEqual(999999.99m, payment.TotalCostAmount);
  }

  /// <summary>
  /// Validates tax amount greater than cost amount (edge case).
  /// </summary>
  [TestMethod]
  public void PaymentInformation_TaxGreaterThanCost_IsAllowed()
  {
    // Arrange & Act
    var payment = new PaymentInformation
    {
      TotalCostAmount = 100m,
      TotalTaxAmount = 200m
    };

    // Assert - No validation preventing this edge case
    Assert.AreEqual(100m, payment.TotalCostAmount);
    Assert.AreEqual(200m, payment.TotalTaxAmount);
  }

  /// <summary>
  /// Validates very old transaction date.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_VeryOldDate_IsAllowed()
  {
    // Arrange & Act
    var payment = new PaymentInformation
    {
      TransactionDate = new DateTimeOffset(1900, 1, 1, 0, 0, 0, TimeSpan.Zero)
    };

    // Assert
    Assert.AreEqual(1900, payment.TransactionDate.Year);
  }

  /// <summary>
  /// Validates future transaction date.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_FutureDate_IsAllowed()
  {
    // Arrange & Act
    var payment = new PaymentInformation
    {
      TransactionDate = new DateTimeOffset(2100, 12, 31, 23, 59, 59, TimeSpan.Zero)
    };

    // Assert
    Assert.AreEqual(2100, payment.TransactionDate.Year);
  }

  /// <summary>
  /// Validates high precision decimal amounts.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_HighPrecisionAmount_IsAllowed()
  {
    // Arrange & Act
    var payment = new PaymentInformation
    {
      TotalCostAmount = 123.456789m,
      TotalTaxAmount = 23.456789m
    };

    // Assert
    Assert.AreEqual(123.456789m, payment.TotalCostAmount);
    Assert.AreEqual(23.456789m, payment.TotalTaxAmount);
  }

  /// <summary>
  /// Validates record equality.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_SameValues_AreEqual()
  {
    // Arrange
    var date = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero);
    var payment1 = new PaymentInformation
    {
      TransactionDate = date,
      PaymentType = PaymentType.CARD,
      TotalCostAmount = 100m,
      TotalTaxAmount = 19m
    };
    var payment2 = new PaymentInformation
    {
      TransactionDate = date,
      PaymentType = PaymentType.CARD,
      TotalCostAmount = 100m,
      TotalTaxAmount = 19m
    };

    // Assert
    Assert.AreEqual(payment1, payment2);
  }

  /// <summary>
  /// Validates record inequality.
  /// </summary>
  [TestMethod]
  public void PaymentInformation_DifferentValues_AreNotEqual()
  {
    // Arrange
    var payment1 = new PaymentInformation { TotalCostAmount = 100m };
    var payment2 = new PaymentInformation { TotalCostAmount = 200m };

    // Assert
    Assert.AreNotEqual(payment1, payment2);
  }

  #endregion

  #region Currency Tests

  /// <summary>
  /// Validates Currency can be created.
  /// </summary>
  [TestMethod]
  public void Currency_Creation_StoresValues()
  {
    // Arrange & Act
    var currency = new Currency("US Dollar", "USD", "$");

    // Assert
    Assert.AreEqual("US Dollar", currency.Name);
    Assert.AreEqual("USD", currency.Code);
    Assert.AreEqual("$", currency.Symbol);
  }

  /// <summary>
  /// Validates common currencies.
  /// </summary>
  [TestMethod]
  [DataRow("US Dollar", "USD", "$")]
  [DataRow("Euro", "EUR", "Euro")]
  [DataRow("British Pound", "GBP", "Pounds")]
  [DataRow("Romanian Leu", "RON", "lei")]
  public void Currency_CommonCurrencies_AreAccepted(string name, string code, string symbol)
  {
    // Arrange & Act
    var currency = new Currency(name, code, symbol);

    // Assert
    Assert.AreEqual(name, currency.Name);
    Assert.AreEqual(code, currency.Code);
    Assert.AreEqual(symbol, currency.Symbol);
  }

  #endregion
}
