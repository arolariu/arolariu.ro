namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Defines server-side validation for invoice scans before durable use.
/// </summary>
/// <remarks>
/// <para>
/// <b>Layer Role (The Standard):</b> This foundation service owns deterministic approved-storage validation and
/// broker-neighboring Blob Storage property checks. It does not mutate invoice aggregates or call Document
/// Intelligence.
/// </para>
/// <para>
/// A client SAS authorizes an upload but cannot enforce the uploaded content length. This contract therefore makes
/// backend property validation authoritative before an invoice creation or scan attachment can be persisted.
/// </para>
/// </remarks>
public interface IInvoiceScanStorageFoundationService
{
  /// <summary>
  /// Validates one scan URI and its server-observed blob properties.
  /// </summary>
  /// <param name="scan">The scan to validate before aggregate mutation or persistence.</param>
  /// <param name="cancellationToken">The token used to cancel the storage inspection.</param>
  /// <returns>A task that completes when the scan satisfies the trusted storage contract.</returns>
  Task ValidateInvoiceScanAsync(InvoiceScan scan, CancellationToken cancellationToken);

  /// <summary>
  /// Validates every scan in an invoice creation request before any aggregate is persisted.
  /// </summary>
  /// <param name="scans">The collection of scans to validate.</param>
  /// <param name="cancellationToken">The token used to cancel the storage inspection.</param>
  /// <returns>A task that completes when every scan satisfies the trusted storage contract.</returns>
  Task ValidateInvoiceScansAsync(IEnumerable<InvoiceScan> scans, CancellationToken cancellationToken);
}
