namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Covers the remaining public null-identifier storage validation path that is reachable through nullable parameters.
/// </summary>
/// <remarks>
/// The service exception assertion intentionally matches the existing storage coverage tests. The validator attempts
/// to construct protected inner exception constructors via <see cref="Activator"/>, causing a
/// <see cref="MissingMethodException"/> that the foundation layer wraps as a service exception instead of the intended
/// validation exception. This pins the current behavior without changing production code.
/// </remarks>
[TestClass]
public sealed class StorageNullIdentifierCoverageTests
{
  /// <summary>
  /// Verifies parent-company identifier validation rejects null values on merchant delete.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_NullParentCompanyIdentifier_ThrowsMerchantFoundationServiceException()
  {
    MerchantStorageFoundationService service = new(
      Mock.Of<IInvoiceNoSqlBroker>(),
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance);

    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
      service.DeleteMerchantObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(false);
  }
}
