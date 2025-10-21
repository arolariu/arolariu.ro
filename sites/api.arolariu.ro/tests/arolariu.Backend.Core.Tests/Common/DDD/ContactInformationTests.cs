namespace arolariu.Backend.Core.Tests.Common.DDD;

using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.DDD.ValueObjects;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests for the <see cref="ContactInformation"/> value object covering construction, equality semantics,
/// hash code stability and dictionary key usability. Method names intentionally follow the
/// Method_Component_ExpectedResult pattern per repository standards.
/// </summary>
[SuppressMessage("Design", "CA1515", Justification = "Public class required for MSTest discovery.")]
[SuppressMessage("Naming", "CA1707", Justification = "Underscore naming mandated for tests.")]
[TestClass]
public sealed class ContactInformationTests
{
  private static ContactInformation CreateSample()
  {
    return new("Alice Doe", "123 Main St", "+1-555-0000", "alice@example.test", "https://example.test");
  }

  /// <summary>Validates that constructor sets all provided properties.</summary>
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

  /// <summary>Ensures record struct value equality works for identical field values.</summary>
  [TestMethod]
  public void Value_Equality_Works_For_RecordStruct()
  {
    var a = CreateSample();
    var b = CreateSample();
    Assert.AreEqual(a, b);
    Assert.IsTrue(a == b);
    Assert.IsFalse(a != b);
  }

  /// <summary>Verifies inequality when any field changes.</summary>
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

  /// <summary>Ensures hash codes are consistent for equal values.</summary>
  [TestMethod]
  public void HashCode_Consistent_For_Equal_Values()
  {
    var a = CreateSample();
    var b = CreateSample();
    Assert.AreEqual(a.GetHashCode(), b.GetHashCode());
  }

  /// <summary>Confirms instance usability as dictionary key honoring equality semantics.</summary>
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
