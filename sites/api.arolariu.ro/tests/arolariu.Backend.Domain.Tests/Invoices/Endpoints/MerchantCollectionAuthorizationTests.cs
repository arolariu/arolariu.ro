namespace arolariu.Backend.Domain.Tests.Invoices.Endpoints;

using System;

using arolariu.Backend.Domain.Invoices.Endpoints;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for <see cref="InvoiceEndpoints.IsMerchantCollectionRequestAuthorized"/>.
/// </summary>
[TestClass]
public sealed class MerchantCollectionAuthorizationTests
{
  /// <summary>Verifies that a visibleToUser value matching the caller is authorised.</summary>
  [TestMethod]
  public void IsMerchantCollectionRequestAuthorized_MatchingCaller_ReturnsTrue()
  {
    var caller = Guid.NewGuid();
    Assert.IsTrue(InvoiceEndpoints.IsMerchantCollectionRequestAuthorized(caller, caller));
  }

  /// <summary>Verifies that an absent visibleToUser value is authorised and implies the caller.</summary>
  [TestMethod]
  public void IsMerchantCollectionRequestAuthorized_AbsentValue_ReturnsTrue()
  {
    Assert.IsTrue(InvoiceEndpoints.IsMerchantCollectionRequestAuthorized(Guid.NewGuid(), null));
  }

  /// <summary>Verifies that requesting another user's merchants is rejected.</summary>
  [TestMethod]
  public void IsMerchantCollectionRequestAuthorized_DifferentUser_ReturnsFalse()
  {
    Assert.IsFalse(InvoiceEndpoints.IsMerchantCollectionRequestAuthorized(Guid.NewGuid(), Guid.NewGuid()));
  }

  /// <summary>Verifies that an empty-guid visibleToUser that differs from the caller is rejected.</summary>
  [TestMethod]
  public void IsMerchantCollectionRequestAuthorized_EmptyGuidDifferentFromCaller_ReturnsFalse()
  {
    Assert.IsFalse(InvoiceEndpoints.IsMerchantCollectionRequestAuthorized(Guid.NewGuid(), Guid.Empty));
  }
}
