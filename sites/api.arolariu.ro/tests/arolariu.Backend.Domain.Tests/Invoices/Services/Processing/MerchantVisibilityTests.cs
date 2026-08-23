namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>Verifies that merchant visibility is derived from the caller's own invoices.</summary>
[TestClass]
public sealed class MerchantVisibilityTests
{
  /// <summary>Verifies that duplicate and empty merchant references collapse to a distinct, non-empty set.</summary>
  [TestMethod]
  public void ResolveVisibleMerchantIdentifiers_DuplicateAndEmptyReferences_ReturnsDistinctNonEmpty()
  {
    var first = Guid.NewGuid();
    var second = Guid.NewGuid();
    var invoices = new List<Invoice>
    {
      new() { id = Guid.NewGuid(), UserIdentifier = Guid.Empty, MerchantReference = first },
      new() { id = Guid.NewGuid(), UserIdentifier = Guid.Empty, MerchantReference = first },
      new() { id = Guid.NewGuid(), UserIdentifier = Guid.Empty, MerchantReference = second },
      new() { id = Guid.NewGuid(), UserIdentifier = Guid.Empty, MerchantReference = Guid.Empty },
    };

    IReadOnlyCollection<Guid> identifiers = MerchantVisibilityResolver.ResolveVisibleMerchantIdentifiers(invoices);

    Assert.AreEqual(2, identifiers.Count);
    Assert.IsTrue(identifiers.Contains(first));
    Assert.IsTrue(identifiers.Contains(second));
    Assert.IsFalse(identifiers.Contains(Guid.Empty));
  }

  /// <summary>Verifies that an invoice set with no linked merchants yields an empty identifier set.</summary>
  [TestMethod]
  public void ResolveVisibleMerchantIdentifiers_NoLinkedMerchants_ReturnsEmpty()
  {
    var invoices = new List<Invoice>
    {
      new() { id = Guid.NewGuid(), UserIdentifier = Guid.Empty, MerchantReference = Guid.Empty },
    };

    IReadOnlyCollection<Guid> identifiers = MerchantVisibilityResolver.ResolveVisibleMerchantIdentifiers(invoices);

    Assert.AreEqual(0, identifiers.Count);
  }

  /// <summary>Verifies that a null invoice sequence is treated as an empty set rather than throwing.</summary>
  [TestMethod]
  public void ResolveVisibleMerchantIdentifiers_NullSequence_ReturnsEmpty()
  {
    IReadOnlyCollection<Guid> identifiers = MerchantVisibilityResolver.ResolveVisibleMerchantIdentifiers(null);

    Assert.AreEqual(0, identifiers.Count);
  }
}
