namespace arolariu.Backend.Core.Tests.Common.DDD;

using arolariu.Backend.Common.DDD.ValueObjects;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for the <see cref="Currency"/> value object verifying constructor property assignment
/// and value equality semantics. Method names follow the mandated MethodName_Condition_ExpectedResult pattern.
/// </summary>
[TestClass]
public sealed class CurrencyTests
{
  /// <summary>Ensures constructor assigns properties as provided.</summary>
  [TestMethod]
  public void Constructor_SetsProperties()
  {
    var currency = new Currency("US Dollar", "USD", "$");
    Assert.AreEqual("US Dollar", currency.Name);
    Assert.AreEqual("USD", currency.Code);
    Assert.AreEqual("$", currency.Symbol);
  }

  /// <summary>Validates record struct value equality semantics for identical instances.</summary>
  [TestMethod]
  public void ValueEquality_WorksAsRecordStruct()
  {
    var a = new Currency("Euro", "EUR", "€");
    var b = new Currency("Euro", "EUR", "€");
    Assert.AreEqual(a, b);
    Assert.IsTrue(a == b);
  }
}
