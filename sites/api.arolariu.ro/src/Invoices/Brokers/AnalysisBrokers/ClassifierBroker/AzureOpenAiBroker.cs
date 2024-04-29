namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Azure;
using Azure.AI.OpenAI.Assistants;

using Microsoft.Extensions.Options;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;

/// <summary>
/// The Azure OpenAI broker service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public sealed class AzureOpenAiBroker(IOptionsSnapshot<AzureOptions> options) : IClassifierBroker
{
	[SuppressMessage("Style", "IDE1006:Naming Styles", Justification = "Old style implementation")]
	private AssistantsClient _client { get; init; } = new AssistantsClient(
		new Uri(options.Value.OpenAIEndpoint),
		new AzureKeyCredential(options.Value.OpenAIKey));

	private Assistant InvoiceAssistant => _client.GetAssistant("id1");

	/// <inheritdoc/>
	public async Task<string> GenerateInvoiceDescription(Invoice invoice)
	{
		var productsList = invoice?.Items.Select(item => item.GenericName).ToList();
		var merchantName = invoice?.Merchant?.Name;

		AssistantThread thread = await _client.CreateThreadAsync().ConfigureAwait(false);
		await _client
				.CreateMessageAsync(thread.Id, MessageRole.User, "Given the following products and merchant:\n" +
				$"{string.Join(",\n", productsList!)}\n" +
				$"Merchant Name: {merchantName}\n" +
				"Create a short, 15 characters long, funny & smart invoice description.")
				.ConfigureAwait(false);

		ThreadRun run = await _client
								.CreateRunAsync(thread.Id, new CreateRunOptions(InvoiceAssistant.Id))
								.ConfigureAwait(false);

		do
		{
			await Task.Delay(TimeSpan.FromMilliseconds(500)).ConfigureAwait(false);
			run = await _client.GetRunAsync(thread.Id, run.Id).ConfigureAwait(false);
		}
		while (run.Status == RunStatus.Queued
			|| run.Status == RunStatus.InProgress);

		PageableList<ThreadMessage> messagesPage = await _client.GetMessagesAsync(thread.Id).ConfigureAwait(false);
		IReadOnlyList<ThreadMessage> messages = messagesPage.Data;

		foreach (ThreadMessage threadMessage in messages.Reverse())
		{
			Console.Write($"{threadMessage.CreatedAt:yyyy-MM-dd HH:mm:ss} - {threadMessage.Role,10}: ");
			foreach (MessageContent contentItem in threadMessage.ContentItems)
			{
				if (contentItem is MessageTextContent textItem)
				{
					Console.Write(textItem.Text);
				}
				Console.WriteLine();
			}
		}

		return messages[^1].ContentItems.OfType<MessageTextContent>().Last().Text;
	}

	/// <inheritdoc/>
	public Task<IEnumerable<Allergen>> GeneratePossibleAllergens(Product product)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<IEnumerable<Recipe>> GeneratePossibleRecipes(IEnumerable<Product> products)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<int> GeneratePossibleSurvivalDays(IEnumerable<Product> products)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<ProductCategory> GenerateProductCategory(Product product)
	{
		throw new NotImplementedException();
	}

	/// <inheritdoc/>
	public Task<string> GenerateProductGenericName(Product product)
	{
		throw new NotImplementedException();
	}
}
