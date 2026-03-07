namespace arolariu.Backend.Core.Tests.Common.Configuration;

using System;
using System.Collections.Generic;

using arolariu.Backend.Common.Configuration;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="FeatureSnapshotCache"/> covering construction, snapshot isolation,
/// IsEnabled behaviour, and atomic updates.
/// Naming follows MethodName_Condition_ExpectedResult.
/// </summary>
[TestClass]
public sealed class FeatureSnapshotCacheTests
{
  private static readonly DateTimeOffset TestTimestamp = new(2025, 1, 1, 0, 0, 0, TimeSpan.Zero);

  // ──────────────────────────────── constructor ────────────────────────────

  /// <summary>Constructor stores initial features, version, and timestamp.</summary>
  [TestMethod]
  public void Ctor_ValidInput_StoresSnapshot()
  {
    var features = new Dictionary<string, bool> { ["feature.a"] = true, ["feature.b"] = false };
    var cache = new FeatureSnapshotCache(features, "v2", TestTimestamp);

    Assert.AreEqual("v2", cache.ContractVersion);
    Assert.AreEqual(TestTimestamp, cache.FetchedAt);
    var current = cache.CurrentFeatures;
    Assert.IsTrue(current["feature.a"]);
    Assert.IsFalse(current["feature.b"]);
  }

  /// <summary>Constructor with null features dictionary throws ArgumentNullException.</summary>
  [TestMethod]
  public void Ctor_NullFeatures_ThrowsArgumentNullException()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() =>
      _ = new FeatureSnapshotCache(null!, "v1", TestTimestamp));
  }

  /// <summary>Constructor with null contractVersion stores empty string.</summary>
  [TestMethod]
  public void Ctor_NullContractVersion_StoredAsEmpty()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), null!, TestTimestamp);
    Assert.AreEqual(string.Empty, cache.ContractVersion);
  }

  /// <summary>Constructor with empty features dictionary creates a valid but empty cache.</summary>
  [TestMethod]
  public void Ctor_EmptyFeatures_CreatesValidEmptyCache()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v0", TestTimestamp);
    Assert.AreEqual(0, cache.CurrentFeatures.Count);
  }

  // ──────────────────────────────── CurrentFeatures isolation ──────────────

  /// <summary>CurrentFeatures returns a copy on each call, not the same reference.</summary>
  [TestMethod]
  public void CurrentFeatures_CalledTwice_ReturnsDifferentReferences()
  {
    var features = new Dictionary<string, bool> { ["x"] = true };
    var cache = new FeatureSnapshotCache(features, "v1", TestTimestamp);

    var first = cache.CurrentFeatures;
    var second = cache.CurrentFeatures;

    Assert.AreNotSame(first, second);
  }

  /// <summary>Mutating the returned dictionary does not affect the cached snapshot.</summary>
  [TestMethod]
  public void CurrentFeatures_MutatingResult_DoesNotAffectCache()
  {
    var cache = new FeatureSnapshotCache(
      new Dictionary<string, bool> { ["feat"] = true }, "v1", TestTimestamp);

    var copy = (Dictionary<string, bool>)cache.CurrentFeatures;
    copy["feat"] = false; // mutate the returned copy

    // Cache should still say true
    Assert.IsTrue(cache.IsEnabled("feat"));
  }

  // ──────────────────────────────── IsEnabled ──────────────────────────────

  /// <summary>IsEnabled returns true for an existing enabled feature.</summary>
  [TestMethod]
  public void IsEnabled_ExistingEnabledFeature_ReturnsTrue()
  {
    var cache = new FeatureSnapshotCache(
      new Dictionary<string, bool> { ["invoices.analysis"] = true }, "v1", TestTimestamp);
    Assert.IsTrue(cache.IsEnabled("invoices.analysis"));
  }

  /// <summary>IsEnabled returns false for an existing disabled feature.</summary>
  [TestMethod]
  public void IsEnabled_ExistingDisabledFeature_ReturnsFalse()
  {
    var cache = new FeatureSnapshotCache(
      new Dictionary<string, bool> { ["invoices.export"] = false }, "v1", TestTimestamp);
    Assert.IsFalse(cache.IsEnabled("invoices.export"));
  }

  /// <summary>IsEnabled returns false for an unknown feature (closed-world assumption).</summary>
  [TestMethod]
  public void IsEnabled_UnknownFeatureId_ReturnsFalse()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v1", TestTimestamp);
    Assert.IsFalse(cache.IsEnabled("nonexistent.feature"));
  }

  /// <summary>IsEnabled with null feature ID throws ArgumentNullException.</summary>
  [TestMethod]
  public void IsEnabled_NullFeatureId_ThrowsArgumentNullException()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v1", TestTimestamp);
    Assert.ThrowsExactly<ArgumentNullException>(() => cache.IsEnabled(null!));
  }

  /// <summary>IsEnabled with whitespace feature ID throws ArgumentException.</summary>
  [TestMethod]
  public void IsEnabled_WhitespaceFeatureId_ThrowsArgumentException()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v1", TestTimestamp);
    Assert.ThrowsExactly<ArgumentException>(() => cache.IsEnabled("   "));
  }

  // ──────────────────────────────── Update ─────────────────────────────────

  /// <summary>Update atomically replaces features, contractVersion, and fetchedAt.</summary>
  [TestMethod]
  public void Update_WithValidSnapshot_ReplacesAllFields()
  {
    var cache = new FeatureSnapshotCache(
      new Dictionary<string, bool> { ["old.feat"] = true }, "v1", TestTimestamp);

    var newTimestamp = TestTimestamp.AddHours(1);
    var newFeatures = new Dictionary<string, bool> { ["new.feat"] = true };

    cache.Update(newFeatures, "v9", newTimestamp);

    Assert.AreEqual("v9", cache.ContractVersion);
    Assert.AreEqual(newTimestamp, cache.FetchedAt);
    Assert.IsFalse(cache.IsEnabled("old.feat")); // old feature gone
    Assert.IsTrue(cache.IsEnabled("new.feat"));  // new feature visible
  }

  /// <summary>Update with null features throws ArgumentNullException.</summary>
  [TestMethod]
  public void Update_NullFeatures_ThrowsArgumentNullException()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v1", TestTimestamp);
    Assert.ThrowsExactly<ArgumentNullException>(() => cache.Update(null!, "v2", TestTimestamp));
  }

  /// <summary>Update with null contractVersion stores empty string.</summary>
  [TestMethod]
  public void Update_NullContractVersion_StoredAsEmpty()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v1", TestTimestamp);
    cache.Update(new Dictionary<string, bool>(), null!, TestTimestamp);
    Assert.AreEqual(string.Empty, cache.ContractVersion);
  }

  /// <summary>Multiple sequential updates each reflect the latest state.</summary>
  [TestMethod]
  public void Update_MultipleSequential_LastUpdateWins()
  {
    var cache = new FeatureSnapshotCache(new Dictionary<string, bool>(), "v0", TestTimestamp);

    cache.Update(new Dictionary<string, bool> { ["f"] = true }, "v1", TestTimestamp);
    cache.Update(new Dictionary<string, bool> { ["f"] = false }, "v2", TestTimestamp);

    Assert.IsFalse(cache.IsEnabled("f"));
    Assert.AreEqual("v2", cache.ContractVersion);
  }
}
