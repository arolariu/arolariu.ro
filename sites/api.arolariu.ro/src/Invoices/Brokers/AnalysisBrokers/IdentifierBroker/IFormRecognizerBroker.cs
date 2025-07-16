namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;

using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

/// <summary>
/// Interface for the receipt recognizer broker.
/// This interface is used to recognize the merchant, payment information and products from an invoice photo.
/// </summary>
public interface IFormRecognizerBroker
{
	/// <summary>
	/// Sends a single invoice to analysis.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public ValueTask<Invoice> PerformOcrAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options);
}
