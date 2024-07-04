namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using OpenAI.Chat;

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public sealed partial class AzureOpenAiBroker
{
	internal async Task<string> GenerateInvoiceName(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();

		var invoiceNameCompletion = await client.CompleteChatAsync(
			new List<ChatMessage>() {
				new SystemChatMessage("Given a list of products from a receipt, generate a funny, 3 word receipt name."),
				new SystemChatMessage("Only output the 3 word name that you've came up with. For example:"),
				new UserChatMessage("Products: lemon, tomato, tea, flour, detergent, paper"),
				new AssistantChatMessage("Bloody ice tea!"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Products: {string.Join(',', invoiceProducts)}")
			}).ConfigureAwait(false);

		var invoiceName = invoiceNameCompletion.Value.Content[0].Text;
		return invoiceName;
	}

	internal async Task<string> GenerateInvoiceDescription(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();

		var invoiceDescriptionCompletion = await client.CompleteChatAsync(
			new List<ChatMessage>() {
				new SystemChatMessage("Given a list of products from a receipt, generate a maximum of 7 words receipt description."),
				new SystemChatMessage("Only output the description that you've came up with. For example:"),
				new UserChatMessage("Products: toilet paper, vodka, milk, beer, tomato, cucumber"),
				new AssistantChatMessage("Explosive mix of ingredients (beware)!"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Products: {string.Join(',', invoiceProducts)}"),
			}).ConfigureAwait(false);

		var invoiceDescription = invoiceDescriptionCompletion.Value.Content[0].Text;
		return invoiceDescription;
	}

	internal async Task<IEnumerable<Recipe>> GenerateInvoiceRecipes(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();

		var invoiceRecipesCompletion = await client.CompleteChatAsync(
			new List<ChatMessage>() {
				new SystemChatMessage("Given a list of products from a receipt, generate the names of recipes you can come up with"),
				new SystemChatMessage("Only output the names of the receipts that you;ve came up with, separated by a vertical line (|). For example:"),
				new UserChatMessage("Products: parmezan, flour, tomato, rigatoni pasta, pepper, salami, minced meat"),
				new AssistantChatMessage("Pizza with parmezan and salami | Rigatoni filled with minced meat and parmezan | Tomatoes soup with parmezan"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Products: {string.Join(',', invoiceProducts)}")
			}).ConfigureAwait(false);

		var invoiceRecipesAsString = invoiceRecipesCompletion.Value.Content[0].Text;
		var invoiceRecipesAsList = invoiceRecipesAsString.Split("|").ToList();

		var recipesList = new List<Recipe>();
		foreach (var recipeName in invoiceRecipesAsList)
			recipesList.Add(new Recipe(recipeName));

		return recipesList;
	}
}
