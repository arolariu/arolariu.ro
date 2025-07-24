namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure.AI.OpenAI;
using Azure.Identity;

/// <summary>
/// The Azure OpenAI broker service.
/// This concrete class will use the Azure OpenAI client to perform the invoice analysis.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
#pragma warning disable OPENAI001 // acknowledge the fact that the OpenAI API is not yet stable
public sealed partial class AzureOpenAiBroker : IOpenAiBroker
{
	private readonly AzureOpenAIClient openAIClient;

	/// <summary>
	/// Constructor.
	/// </summary>
	/// <param name="optionsManager"></param>
	public AzureOpenAiBroker(IOptionsManager optionsManager)
	{
		ArgumentNullException.ThrowIfNull(optionsManager);
		ApplicationOptions options = optionsManager.GetApplicationOptions();

		var openAiEndpoint = options.OpenAIEndpoint;
		var openAiApiKey = options.OpenAIKey;
		var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
			}
#endif
		);

		openAIClient = new AzureOpenAIClient(
			endpoint: new Uri(openAiEndpoint),
			credential: credentials);
	}

	/// <inheritdoc/>
	public async ValueTask<Invoice> PerformGptAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
	{
		ArgumentNullException.ThrowIfNull(invoice);

		invoice.Name = await GenerateInvoiceName(invoice).ConfigureAwait(false);
		invoice.Description = await GenerateInvoiceDescription(invoice).ConfigureAwait(false);

		#region Generate possible products
		foreach (var product in invoice.Items)
		{
			// TODO: further processing of the product.
			product.Category = await GenerateProductCategory(product).ConfigureAwait(false);
			product.DetectedAllergens = await GenerateProductAllergens(product).ConfigureAwait(false);
		}
		#endregion

		#region Generate possible recipes.
		var possibleRecipesCollection = await GenerateInvoiceRecipes(invoice).ConfigureAwait(false);
		foreach (var recipe in possibleRecipesCollection)
		{
			// TODO: further processing of the recipe.
			invoice.PossibleRecipes.Add(recipe);
		}
		#endregion
		// TODO: further processing of the invoice.

		invoice.Category = await GenerateInvoiceCategory(invoice).ConfigureAwait(false);
		return invoice;
	}
}
