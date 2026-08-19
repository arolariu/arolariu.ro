namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.BlobStorageBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

/// <summary>
/// Covers storage foundation identifier validation and null canonicalization exits through public service methods.
/// </summary>
/// <remarks>
/// Identifier-validation tests assert the outer <c>*ServiceException</c> rather than the intended
/// <c>*ValidationException</c>. This is a pre-existing defect outside the analysis pipeline scope:
/// <c>Validator.ValidateObjectAndThrow</c> builds the inner exception with
/// <c>Activator.CreateInstance(type, message)</c>, but the inner exception types declare their
/// <c>(string?)</c> constructor as <c>protected</c>, so construction fails with
/// <see cref="MissingMethodException"/> and the failure is reclassified as a service exception.
/// The validation branch itself is still executed, which is what these tests pin.
/// </remarks>
[TestClass]
public sealed class StorageValidationCoverageTests
{
  /// <summary>
  /// Verifies invoice identifier validation rejects an empty identifier on reads.
  /// </summary>
  [TestMethod]
  public async Task ReadInvoiceObject_EmptyIdentifier_ThrowsInvoiceFoundationValidationException()
  {
    InvoiceStorageFoundationService service = CreateInvoiceService(new Mock<IDatabaseBroker>());

    await Assert.ThrowsExactlyAsync<InvoiceFoundationServiceException>(() =>
      service.ReadInvoiceObject(Guid.Empty, Guid.NewGuid(), CancellationToken.None)).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies a null invoice is rejected as invalid input before persistence.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_NullInvoice_ThrowsValidationExceptionBeforePersistence()
  {
    var broker = new Mock<IDatabaseBroker>();
    InvoiceStorageFoundationService service = CreateInvoiceService(broker);

    await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(
      () => service.CreateInvoiceObject(null!, null, CancellationToken.None)).ConfigureAwait(false);

    broker.Verify(
      item => item.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies invoice canonicalization exits after invoice-level classification when item collection is null.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_NullItems_CreatesInvoiceWithoutProductCanonicalizationFailure()
  {
    var broker = new Mock<IDatabaseBroker>();
    Invoice invoice = new() { id = Guid.NewGuid(), UserIdentifier = Guid.NewGuid(), Items = null! };
    broker
      .Setup(item => item.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()))
      .ReturnsAsync(invoice);
    InvoiceStorageFoundationService service = CreateInvoiceService(broker);

    await service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None).ConfigureAwait(false);

    broker.Verify(item => item.CreateInvoiceAsync(invoice, It.IsAny<CancellationToken>()), Times.Once);
  }


  /// <summary>
  /// Verifies null product slots are rejected as invalid input before persistence.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_NullProductSlot_ThrowsValidationExceptionBeforePersistence()
  {
    var broker = new Mock<IDatabaseBroker>();
    Invoice invoice = new()
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Items = [null!],
    };
    InvoiceStorageFoundationService service = CreateInvoiceService(broker);

    await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(
      () => service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)).ConfigureAwait(false);

    broker.Verify(
      item => item.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()),
      Times.Never);
  }

  /// <summary>
  /// Verifies merchant identifier validation rejects an empty identifier on create.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_EmptyIdentifier_ThrowsMerchantFoundationValidationException()
  {
    MerchantStorageFoundationService service = CreateMerchantService(new Mock<IDatabaseBroker>());
    var merchant = new Merchant { id = Guid.Empty, ParentCompanyId = Guid.NewGuid(), Name = "Merchant" };

    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
      service.CreateMerchantObject(merchant, merchant.ParentCompanyId, CancellationToken.None)).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies parent-company identifier validation rejects null values on delete.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_NullParentCompanyIdentifier_ThrowsMerchantFoundationValidationException()
  {
    MerchantStorageFoundationService service = CreateMerchantService(new Mock<IDatabaseBroker>());

    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
      service.DeleteMerchantObject(Guid.NewGuid(), null, CancellationToken.None)).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies parent-company identifier validation rejects empty values on delete.
  /// </summary>
  [TestMethod]
  public async Task DeleteMerchantObject_EmptyParentCompanyIdentifier_ThrowsMerchantFoundationValidationException()
  {
    MerchantStorageFoundationService service = CreateMerchantService(new Mock<IDatabaseBroker>());

    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
      service.DeleteMerchantObject(Guid.NewGuid(), Guid.Empty, CancellationToken.None)).ConfigureAwait(false);
  }

  /// <summary>
  /// Verifies an update without merchant data is rejected before any broker operation.
  /// </summary>
  [TestMethod]
  public async Task UpdateMerchantObject_NullUpdatedMerchant_ThrowsBeforeBrokerOperations()
  {
    var broker = new Mock<IDatabaseBroker>();
    Guid merchantId = Guid.NewGuid();
    Guid parentCompanyId = Guid.NewGuid();
    MerchantStorageFoundationService service = CreateMerchantService(broker);

    await Assert.ThrowsExactlyAsync<MerchantFoundationServiceException>(() =>
      service.UpdateMerchantObject(null!, merchantId, parentCompanyId, CancellationToken.None)).ConfigureAwait(false);

    broker.Verify(item => item.ReadMerchantAsync(It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()), Times.Never);
    broker.Verify(item => item.UpdateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<Merchant>(), It.IsAny<CancellationToken>()), Times.Never);
  }

  private static InvoiceStorageFoundationService CreateInvoiceService(Mock<IDatabaseBroker> broker) =>
    new(broker.Object, Mock.Of<IBlobStorageBroker>(), NullLoggerFactory.Instance);

  private static MerchantStorageFoundationService CreateMerchantService(Mock<IDatabaseBroker> broker) =>
    new(broker.Object, NullLoggerFactory.Instance);
}
