namespace arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

/// <summary>
/// Defines the provider-neutral receipt-document extraction boundary for scanned invoice sources.
/// </summary>
/// <remarks>
/// <para>
/// This broker is the new Task 5 extraction boundary that replaces aggregate-mutating OCR calls
/// for new analysis-pipeline work. It accepts only the external scan location and returns an
/// immutable, provider-neutral <see cref="ReceiptDocument"/> contract.
/// </para>
/// <para>
/// Broker implementations MUST remain thin wrappers over external SDKs and MUST NOT accept or
/// mutate invoice, merchant, or product aggregates.
/// </para>
/// </remarks>
public interface IDocumentIntelligenceBroker
{
  /// <summary>
  /// Analyzes a single receipt scan and returns its provider-neutral extraction result.
  /// </summary>
  /// <param name="scanLocation">The absolute location of the receipt scan to analyze.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the external SDK call.</param>
  /// <returns>The extracted provider-neutral receipt document.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="scanLocation"/> is null.</exception>
  /// <exception cref="OperationCanceledException">Thrown when <paramref name="cancellationToken"/> is canceled.</exception>
  ValueTask<ReceiptDocument> AnalyzeReceiptAsync(
    Uri scanLocation,
    CancellationToken cancellationToken);
}
