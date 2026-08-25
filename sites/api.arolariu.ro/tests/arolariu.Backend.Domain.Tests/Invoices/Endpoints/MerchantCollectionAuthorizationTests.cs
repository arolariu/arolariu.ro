namespace arolariu.Backend.Domain.Tests.Invoices.Endpoints;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Endpoints;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Unit tests for merchant collection authorization and caller-scoped response projection.
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

  /// <summary>Verifies the caller-scoped projection removes cross-tenant relationships, principals, and metadata.</summary>
  [TestMethod]
  public void FromMerchantForCaller_SharedMerchant_RedactsCrossTenantFields()
  {
    var callerIdentifier = Guid.NewGuid();
    var callerInvoiceIdentifier = Guid.NewGuid();
    var unrelatedInvoiceIdentifier = Guid.NewGuid();
    var merchant = new Merchant
    {
      id = Guid.NewGuid(),
      Name = "Shared merchant",
      CreatedBy = Guid.NewGuid(),
      AdditionalMetadata = new Dictionary<string, string>
      {
        ["user.note"] = "private note",
        ["integration.source"] = "shared import",
      },
    };
    merchant.ReferencedInvoices.Add(callerInvoiceIdentifier);
    merchant.ReferencedInvoices.Add(unrelatedInvoiceIdentifier);

    MerchantResponseDto response = MerchantResponseDto.FromMerchantForCaller(
      merchant,
      callerIdentifier,
      new HashSet<Guid> { callerInvoiceIdentifier });

    Assert.AreEqual(1, response.ReferencedInvoiceCount);
    CollectionAssert.AreEqual(
      new[] { callerInvoiceIdentifier },
      new List<Guid>(response.ReferencedInvoiceIds));
    Assert.IsEmpty(response.AdditionalMetadata);
    Assert.AreEqual(Guid.Empty, response.CreatedBy);
    Assert.AreEqual(Guid.Empty, response.LastUpdatedBy);
  }
}
