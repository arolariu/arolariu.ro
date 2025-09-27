namespace arolariu.Backend.Core.Tests.Common.DDD;

using System.Collections.Generic;
using arolariu.Backend.Common.DDD.ValueObjects;
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public sealed class ContactInformationTests
{
  private static ContactInformation CreateSample()
    => new("Alice Doe", "123 Main St", "+1-555-0000", "alice@example.test", "https://example.test");

  [TestMethod]
  public void Constructor_Sets_All_Properties()
  {
    var ci = CreateSample();
    Assert.AreEqual("Alice Doe", ci.FullName);
    Assert.AreEqual("123 Main St", ci.Address);
    Assert.AreEqual("+1-555-0000", ci.PhoneNumber);
    Assert.AreEqual("alice@example.test", ci.EmailAddress);
    Assert.AreEqual("https://example.test", ci.Website);
  }

  [TestMethod]
  public void Value_Equality_Works_For_RecordStruct()
  {
    var a = CreateSample();
    var b = CreateSample();
    Assert.AreEqual(a, b);
    Assert.IsTrue(a == b);
    Assert.IsFalse(a != b);
  }

  [TestMethod]
  public void Inequality_Detected_When_Changing_Any_Field()
  {
    var baseline = CreateSample();
    var modified = new ContactInformation(
      baseline.FullName,
      baseline.Address,
      baseline.PhoneNumber,
      "different@example.test",
      baseline.Website);
    Assert.AreNotEqual(baseline, modified);
    Assert.IsTrue(baseline != modified);
  }

  [TestMethod]
  public void HashCode_Consistent_For_Equal_Values()
  {
    var a = CreateSample();
    var b = CreateSample();
    Assert.AreEqual(a.GetHashCode(), b.GetHashCode());
  }

  [TestMethod]
  public void Can_Be_Used_As_Dictionary_Key()
  {
    var dict = new Dictionary<ContactInformation, string>();
    var key = CreateSample();
    dict[key] = "stored";
    Assert.IsTrue(dict.ContainsKey(CreateSample()));
    Assert.AreEqual("stored", dict[CreateSample()]);
  }
}
