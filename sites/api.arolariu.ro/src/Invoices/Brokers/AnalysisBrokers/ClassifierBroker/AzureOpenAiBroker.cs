namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

/// <summary>
/// The Azure OpenAI broker service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
#pragma warning disable OPENAI001 // acknowledge the fact that the OpenAI API is not yet stable
public sealed class AzureOpenAiBroker : IOpenAiBroker
{
	/// <inheritdoc/>
	public ValueTask<Invoice> PerformGptAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
	{
		// TODO: implement the OpenAI GPT analysis.
		return new ValueTask<Invoice>(invoice);
	}
}
