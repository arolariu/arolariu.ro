namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

/// <summary>
/// Test-only adapter allowing focused database-boundary doubles to override one contract region.
/// </summary>
internal abstract class DatabaseBrokerTestAdapter : IDatabaseBroker
{
  public virtual ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Invoice> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask DeleteInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Merchant> CreateMerchantAsync(Merchant merchant, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Merchant?> FindMerchantByNormalizedNameAsync(string normalizedName, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

  public virtual ValueTask DeleteMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    throw new NotSupportedException();

}
