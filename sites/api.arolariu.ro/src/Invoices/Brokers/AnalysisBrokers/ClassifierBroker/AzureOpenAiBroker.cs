namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure;
using Azure.AI.OpenAI;

using Microsoft.Extensions.Options;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

/// <summary>
/// The Azure OpenAI broker service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
#pragma warning disable OPENAI001 // acknowledge the fact that the OpenAI API is not yet stable
public sealed partial class AzureOpenAiBroker : IOpenAiBroker
{
	private readonly AzureOpenAIClient openAIClient;

	/// <summary>
	/// Constructor.
	/// </summary>
	/// <param name="options"></param>
	public AzureOpenAiBroker(IOptionsMonitor<AzureOptions> options)
	{
		ArgumentNullException.ThrowIfNull(options);

		var openAiEndpoint = options.CurrentValue.OpenAIEndpoint;
		var openAiApiKey = options.CurrentValue.OpenAIKey;

		openAIClient = new AzureOpenAIClient(
			endpoint: new Uri(openAiEndpoint),
			credential: new AzureKeyCredential(openAiApiKey));
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> PerformGptAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
	{
		ArgumentNullException.ThrowIfNull(invoice, nameof(invoice));

		invoice.Name = await GenerateInvoiceName(invoice).ConfigureAwait(false);
		invoice.Description = await GenerateInvoiceDescription(invoice).ConfigureAwait(false);
		invoice.PossibleRecipes = await GenerateInvoiceRecipes(invoice).ConfigureAwait(false);

		return invoice;
	}
}
