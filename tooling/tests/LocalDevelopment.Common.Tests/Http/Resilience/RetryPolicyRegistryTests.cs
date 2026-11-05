namespace LocalDevelopment.Common.Tests.Http.Resilience;

using global::LocalDevelopment.Common.Http.Resilience;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies named configuration validation and immutable registry snapshots.</summary>
[TestClass]
public sealed class RetryPolicyRegistryTests
{
  /// <summary>Verifies all configuration survives registration without retaining the mutable source collection.</summary>
  [TestMethod]
  public void Constructor_ValidPolicies_SnapshotsConfiguration()
  {
    RetryPolicy policy = CreatePolicy("linear") with
    {
      MaxAttempts = 6,
      CheckCancellationBeforeAttempt = true,
      CheckCancellationAfterAttempt = true,
    };
    var source = new List<RetryPolicy> { policy };

    var registry = new RetryPolicyRegistry(source);
    source.Clear();
    source.Add(policy with { MaxAttempts = 1 });

    Assert.AreSame(policy, registry["linear"]);
    Assert.AreEqual(6, registry["linear"].MaxAttempts);
    Assert.AreSame(policy.GetDelay, registry["linear"].GetDelay);
    Assert.AreSame(policy.ShouldRetry, registry["linear"].ShouldRetry);
    Assert.IsTrue(registry["linear"].CheckCancellationBeforeAttempt);
    Assert.IsTrue(registry["linear"].CheckCancellationAfterAttempt);
  }

  /// <summary>Verifies names differing only in case remain distinct and checks default cancellation behavior.</summary>
  [TestMethod]
  public void Constructor_CaseDistinctNames_UsesOrdinalLookup()
  {
    RetryPolicy lower = CreatePolicy("retry");
    RetryPolicy upper = CreatePolicy("Retry");

    var registry = new RetryPolicyRegistry([lower, upper]);

    Assert.AreSame(lower, registry["retry"]);
    Assert.AreSame(upper, registry["Retry"]);
    Assert.IsFalse(lower.CheckCancellationBeforeAttempt);
    Assert.IsFalse(lower.CheckCancellationAfterAttempt);
    Assert.ThrowsExactly<KeyNotFoundException>(() => _ = registry["RETRY"]);
  }

  /// <summary>Verifies repeated ordinal names are rejected instead of silently replacing configuration.</summary>
  [TestMethod]
  public void Constructor_DuplicateNames_Throws()
  {
    RetryPolicy policy = CreatePolicy("retry");

    Assert.ThrowsExactly<ArgumentException>(() =>
      new RetryPolicyRegistry([policy, policy with { MaxAttempts = 2 }]));
  }

  /// <summary>Verifies an empty snapshot is valid but has no implicit fallback policy.</summary>
  [TestMethod]
  public void Indexer_UnknownName_Throws()
  {
    var registry = new RetryPolicyRegistry([]);

    Assert.ThrowsExactly<KeyNotFoundException>(() => _ = registry["missing"]);
  }

  /// <summary>Verifies null lookup names are rejected.</summary>
  [TestMethod]
  public void Indexer_NullName_Throws()
  {
    var registry = new RetryPolicyRegistry([CreatePolicy("retry")]);

    Assert.ThrowsExactly<ArgumentNullException>(() => _ = registry[null!]);
  }

  /// <summary>Verifies null sequences and null entries cannot create a registry.</summary>
  [TestMethod]
  public void Constructor_NullSequenceOrEntry_Throws()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => new RetryPolicyRegistry(null!));
    Assert.ThrowsExactly<ArgumentNullException>(() => new RetryPolicyRegistry([null!]));
  }

  /// <summary>Verifies null policy names are rejected.</summary>
  [TestMethod]
  public void Constructor_NullPolicyName_Throws()
  {
    Assert.ThrowsExactly<ArgumentNullException>(() => new RetryPolicyRegistry([CreatePolicy(null!)]));
  }

  /// <summary>Verifies empty and whitespace-only policy names are rejected.</summary>
  /// <param name="name">The invalid policy name.</param>
  [TestMethod]
  [DataRow("")]
  [DataRow(" ")]
  [DataRow("\t\r\n")]
  public void Constructor_BlankPolicyName_Throws(string name)
  {
    Assert.ThrowsExactly<ArgumentException>(() => new RetryPolicyRegistry([CreatePolicy(name)]));
  }

  /// <summary>Verifies every policy permits at least the initial operation attempt.</summary>
  /// <param name="maxAttempts">The invalid attempt budget.</param>
  [TestMethod]
  [DataRow(0)]
  [DataRow(-1)]
  public void Constructor_InvalidAttemptBudget_Throws(int maxAttempts)
  {
    RetryPolicy policy = CreatePolicy("retry") with { MaxAttempts = maxAttempts };

    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new RetryPolicyRegistry([policy]));
  }

  /// <summary>Verifies both required configuration delegates are validated before registration.</summary>
  /// <param name="missingDelay">Whether the missing delegate calculates the delay instead of classifying failures.</param>
  [TestMethod]
  [DataRow(true)]
  [DataRow(false)]
  public void Constructor_NullDelegate_Throws(bool missingDelay)
  {
    RetryPolicy policy = missingDelay
      ? CreatePolicy("retry") with { GetDelay = null! }
      : CreatePolicy("retry") with { ShouldRetry = null! };

    Assert.ThrowsExactly<ArgumentNullException>(() => new RetryPolicyRegistry([policy]));
  }

  private static RetryPolicy CreatePolicy(string name) =>
    new(name, 1, static attempt => TimeSpan.FromSeconds(attempt), static (_, _) => true);
}
