namespace arolariu.Backend.Domain.Tests.Invoices.Services.Foundation;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies that the storage foundation services surface a taxonomy resolution failure - a classification that
/// asserts the correct taxonomy system but a code absent from the catalog - as an observable metric and a rethrown
/// <see cref="TaxonomyCodeNotFoundException"/>, distinct from the earlier wrong-system rejection already covered by
/// <see cref="StorageFoundationCanonicalizationTests"/>.
/// </summary>
/// <remarks>
/// <para>These tests wire the production <see cref="JsonTaxonomyBroker"/> over the deterministic in-memory test
/// artifacts from <see cref="TaxonomyBrokerTestFactory"/> so that <c>Resolve</c> genuinely fails for a same-system,
/// unknown code: the resolution-failure catch block cannot be exercised through a mocked broker without duplicating
/// the broker's own lookup semantics.</para>
/// <para>Marked <see cref="DoNotParallelizeAttribute"/> because it uses <see cref="InvoiceMetricRecorder"/>, which
/// subscribes to the process-wide invoices meter.</para>
/// </remarks>
[TestClass]
[DoNotParallelize]
public sealed class TaxonomyResolutionFailureCanonicalizationTests
{
  private const string TaxonomyValidationFailuresInstrument = "invoices.analysis.taxonomy.validation_failures";

  /// <summary>
  /// Verifies that an invoice classification asserting the correct ECOICOP system but an unknown code is rejected
  /// as a foundation validation failure, records the taxonomy validation-failure metric, and never reaches the
  /// persistence broker.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_EcoicopClassificationWithUnknownCode_RecordsTaxonomyValidationFailureAndRethrows()
  {
    // Arrange
    ITaxonomyBroker taxonomyBroker = TaxonomyBrokerTestFactory.Create();
    var invoiceBroker = new Mock<IInvoiceNoSqlBroker>();
    var service = new InvoiceStorageFoundationService(invoiceBroker.Object, taxonomyBroker, NullLoggerFactory.Instance);

    Invoice invoice = new()
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Name = "Unresolvable classification subject",
      Classification = new ClassificationSelectionDto(ClassificationSystem.EcoicopV2, "99.9.9").ToManualSelection(),
    };

    using var metricRecorder = new InvoiceMetricRecorder(TaxonomyValidationFailuresInstrument);

    // Act
    InvoiceFoundationValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(async () =>
        await service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    // Assert
    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
    invoiceBroker.Verify(broker => broker.CreateInvoiceAsync(It.IsAny<Invoice>(), It.IsAny<CancellationToken>()), Times.Never);

    var measurements = metricRecorder.For(TaxonomyValidationFailuresInstrument);
    Assert.AreEqual(1, measurements.Count);
    InvoiceMetricRecorder.AssertTag(measurements[0], "system", "ecoicop_v2");
  }

  /// <summary>
  /// Verifies that a product classification asserting the correct GPC system but an unknown code is rejected as a
  /// foundation validation failure and records the taxonomy validation-failure metric.
  /// </summary>
  [TestMethod]
  public async Task CreateInvoiceObject_ProductClassificationWithUnknownGpcCode_RecordsTaxonomyValidationFailureAndRethrows()
  {
    // Arrange
    ITaxonomyBroker taxonomyBroker = TaxonomyBrokerTestFactory.Create();
    var invoiceBroker = new Mock<IInvoiceNoSqlBroker>();
    var service = new InvoiceStorageFoundationService(invoiceBroker.Object, taxonomyBroker, NullLoggerFactory.Instance);

    Invoice invoice = new()
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Name = "Unresolvable product classification subject",
      Items =
      [
        new Product
        {
          Name = "Unknown product",
          Classification = new ClassificationSelectionDto(ClassificationSystem.Gs1Gpc, "99999999").ToManualSelection(),
        },
      ],
    };

    using var metricRecorder = new InvoiceMetricRecorder(TaxonomyValidationFailuresInstrument);

    // Act
    InvoiceFoundationValidationException exception =
      await Assert.ThrowsExactlyAsync<InvoiceFoundationValidationException>(async () =>
        await service.CreateInvoiceObject(invoice, invoice.UserIdentifier, CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    // Assert
    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);

    var measurements = metricRecorder.For(TaxonomyValidationFailuresInstrument);
    Assert.AreEqual(1, measurements.Count);
    InvoiceMetricRecorder.AssertTag(measurements[0], "system", "gs1_gpc");
  }

  /// <summary>
  /// Verifies that a merchant classification asserting the correct NACE system but an unknown code is rejected as
  /// a foundation validation failure, records the taxonomy validation-failure metric, and never reaches the
  /// persistence broker.
  /// </summary>
  [TestMethod]
  public async Task CreateMerchantObject_NaceClassificationWithUnknownCode_RecordsTaxonomyValidationFailureAndRethrows()
  {
    // Arrange
    ITaxonomyBroker taxonomyBroker = TaxonomyBrokerTestFactory.Create();
    var invoiceBroker = new Mock<IInvoiceNoSqlBroker>();
    var service = new MerchantStorageFoundationService(invoiceBroker.Object, taxonomyBroker, NullLoggerFactory.Instance);

    Merchant merchant = new()
    {
      id = Guid.CreateVersion7(),
      ParentCompanyId = Guid.CreateVersion7(),
      Name = "Unresolvable merchant classification subject",
      Classification = new ClassificationSelectionDto(ClassificationSystem.Nace21, "99").ToManualSelection(),
    };

    using var metricRecorder = new InvoiceMetricRecorder(TaxonomyValidationFailuresInstrument);

    // Act
    MerchantFoundationServiceValidationException exception =
      await Assert.ThrowsExactlyAsync<MerchantFoundationServiceValidationException>(async () =>
        await service.CreateMerchantObject(merchant, merchant.ParentCompanyId, CancellationToken.None)
          .ConfigureAwait(false)).ConfigureAwait(false);

    // Assert
    Assert.IsInstanceOfType<TaxonomyCodeNotFoundException>(exception.InnerException);
    invoiceBroker.Verify(broker => broker.CreateMerchantAsync(It.IsAny<Merchant>(), It.IsAny<CancellationToken>()), Times.Never);

    var measurements = metricRecorder.For(TaxonomyValidationFailuresInstrument);
    Assert.AreEqual(1, measurements.Count);
    InvoiceMetricRecorder.AssertTag(measurements[0], "system", "nace_2_1");
  }
}
