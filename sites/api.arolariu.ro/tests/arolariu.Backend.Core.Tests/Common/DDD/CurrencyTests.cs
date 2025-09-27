namespace arolariu.Backend.Core.Tests.Common.DDD;

using arolariu.Backend.Common.DDD.ValueObjects;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class CurrencyTests
{
  [TestMethod]
  public void Constructor_SetsProperties()
  {
    var currency = new Currency("US Dollar", "USD", "$");
    Assert.AreEqual("US Dollar", currency.Name);
    Assert.AreEqual("USD", currency.Code);
    Assert.AreEqual("$", currency.Symbol);
  }

  [TestMethod]
  public void ValueEquality_WorksAsRecordStruct()
  {
    var a = new Currency("Euro", "EUR", "€");
    var b = new Currency("Euro", "EUR", "€");
    Assert.AreEqual(a, b);
    Assert.IsTrue(a == b);
  }
}
