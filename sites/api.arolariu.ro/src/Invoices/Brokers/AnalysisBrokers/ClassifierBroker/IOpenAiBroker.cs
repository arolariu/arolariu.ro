namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;
using System.Threading.Tasks;

/// <summary>
/// The invoice analysis broker interface.
/// </summary>
public interface IOpenAiBroker
{
	/// <summary>
	/// Sends a single invoice to analysis.
	/// </summary>
	/// <param name="invoice"></param>
	/// <param name="options"></param>
	/// <returns></returns>
	public ValueTask<Invoice> PerformGptAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options);
}
