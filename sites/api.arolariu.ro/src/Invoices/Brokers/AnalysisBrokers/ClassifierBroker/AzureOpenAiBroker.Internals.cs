namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

using System;
using System.ClientModel;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using OpenAI.Chat;

public sealed partial class AzureOpenAiBroker
{
	#region Invoice field generation
	/// <summary>
	/// Generates a short humorous (3-word) invoice name using an LLM prompt over the invoice's product raw names.
	/// </summary>
	/// <remarks>
	/// <para><b>Prompt Strategy:</b> Sends a system instruction plus in-context example (few-shot) to bias towards concise, playful output.</para>
	/// <para><b>Failure Handling:</b> Returns empty string when Azure OpenAI content filter triggers (<c>ChatFinishReason.ContentFilter</c>) or when a
	/// <c>ClientResultException</c> is thrown (network / provider issue). Exceptions are intentionally swallowed to preserve best-effort enrichment flow.</para>
	/// <para><b>Determinism:</b> Output is non-deterministic; upstream layers decide whether to persist or regenerate later.</para>
	/// </remarks>
	/// <param name="invoice">Source invoice whose <c>Items</c> (raw product names) seed the naming prompt (MUST NOT be null).</param>
	/// <returns>Generated three-word name or empty string on graceful degradation.</returns>
	internal async Task<string> GenerateInvoiceName(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();

		try
		{
			var invoiceNameCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>() {
					new SystemChatMessage("Given a list of products from a receipt, generate a funny, 3 word receipt name."),
					new SystemChatMessage("Only output the 3 word name that you've came up with. For example:"),
					new UserChatMessage("Products: lemon, tomato, tea, flour, detergent, paper"),
					new AssistantChatMessage("Bloody ice tea!"),
					new SystemChatMessage("Your turn:"),
					new UserChatMessage($"Products: {string.Join(',', invoiceProducts)}")
				}).ConfigureAwait(false);

			if (invoiceNameCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return string.Empty;
			}

			var invoiceName = invoiceNameCompletion.Value.Content[0].Text;
			return invoiceName;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return string.Empty;
		}
	}

	/// <summary>
	/// Generates a short (max ~7 words) invoice description derived from product names.
	/// </summary>
	/// <remarks>
	/// <para><b>Prompt Strategy:</b> Employs instructive system messages with an example pair to guide tone and brevity.</para>
	/// <para><b>Safety:</b> Content filter or provider failures yield an empty string (no exception propagation).</para>
	/// </remarks>
	/// <param name="invoice">Invoice whose product list seeds the descriptor.</param>
	/// <returns>Concise description or empty string if generation suppressed.</returns>
	internal async Task<string> GenerateInvoiceDescription(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();

		try
		{
			var invoiceDescriptionCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>() {
				new SystemChatMessage("Given a list of products from a receipt, generate a maximum of 7 words receipt description."),
				new SystemChatMessage("Only output the description that you've came up with. For example:"),
				new UserChatMessage("Products: toilet paper, vodka, milk, beer, tomato, cucumber"),
				new AssistantChatMessage("Explosive mix of ingredients (beware)!"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Products: {string.Join(',', invoiceProducts)}"),
				}).ConfigureAwait(false);

			if (invoiceDescriptionCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return string.Empty;
			}

			var invoiceDescription = invoiceDescriptionCompletion.Value.Content[0].Text;
			return invoiceDescription;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return string.Empty;
		}
	}

	/// <summary>
	/// Infers an overall invoice category from the distribution of product categories via LLM classification.
	/// </summary>
	/// <remarks>
	/// <para><b>Validation:</b> Response text is parsed against <see cref="InvoiceCategory"/> enum using <c>Enum.TryParse</c>.</para>
	/// <para><b>Fallback:</b> Returns <see cref="InvoiceCategory.OTHER"/> for filter blocks, parse failures, or provider exceptions.</para>
	/// </remarks>
	/// <param name="invoice">Invoice supplying aggregated item categories.</param>
	/// <returns>Resolved invoice category or OTHER on failure.</returns>
	internal async Task<InvoiceCategory> GenerateInvoiceCategory(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var productCategories = invoice.Items.Select(item => item.Category.ToString()).ToList();
		var availableInvoiceCategories = Enum.GetValues<InvoiceCategory>()
								.Select(category => category.ToString()).ToList();

		try
		{
			var fakeGroceryList = new List<string> { "GROCERY", "DAIRY", "HYGIENE", "DRINKS", "DAIRY" };
			var invoiceCategoryCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>()
				{
					new SystemChatMessage("Given a list of product categories, and a list of receipt categories, guess the category of the receipt."),
					new SystemChatMessage("Only output the category that you've came up with. For example:"),
					new UserChatMessage($"Products: {string.Join(',', fakeGroceryList)}, Invoice: {string.Join(',', availableInvoiceCategories)}"),
					new AssistantChatMessage("GROCERY"),
					new SystemChatMessage("Your turn:"),
					new UserChatMessage($"Products: {string.Join(',', productCategories)}, Invoice: {string.Join(',', availableInvoiceCategories)}")
				}).ConfigureAwait(false);

			if (invoiceCategoryCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return InvoiceCategory.OTHER;
			}

			var invoiceCategory = invoiceCategoryCompletion.Value.Content[0].Text;
			var isValidInvoiceCategory = Enum.TryParse<InvoiceCategory>(invoiceCategory, out var correctInvoiceCategory);
			return isValidInvoiceCategory ? correctInvoiceCategory : InvoiceCategory.OTHER;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return InvoiceCategory.OTHER;
		}
	}

	/// <summary>
	/// Generates a collection of candidate recipe names derived from invoice product composition.
	/// </summary>
	/// <remarks>
	/// <para><b>Parsing:</b> Expects vertical bar (|) separated recipe names; trims and converts each into a <see cref="Recipe"/> with only <c>Name</c> set.</para>
	/// <para><b>Limitations:</b> No semantic deduplication or profanity filtering is applied (backlog: post-processing module).</para>
	/// <para><b>Failure Handling:</b> Returns empty list on provider/content filter failure.</para>
	/// </remarks>
	/// <param name="invoice">Invoice whose product raw names seed the recipe brainstorming prompt.</param>
	/// <returns>Collection of recipe stubs (possibly empty).</returns>
	internal async Task<ICollection<Recipe>> GenerateInvoiceRecipes(Invoice invoice)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();

		try
		{
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
				recipesList.Add(new Recipe() { Name = recipeName });

			return recipesList;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return new List<Recipe>();
		}
	}
	#endregion

	#region Product field generation
	/// <summary>
	/// Classifies a single product into a <see cref="ProductCategory"/> via LLM prompt using raw + generic names.
	/// </summary>
	/// <remarks>
	/// <para><b>Enum Resolution:</b> Attempts direct parse; returns <see cref="ProductCategory.NOT_DEFINED"/> when parse succeeds to a value outside policy, else <see cref="ProductCategory.OTHER"/> on filter / provider failure.</para>
	/// <para><b>Biasing:</b> Includes an example mapping to anchor expected categorical output.</para>
	/// </remarks>
	/// <param name="product">Product value object (raw and generic names populated).</param>
	/// <returns>Resolved category; OTHER / NOT_DEFINED fallback.</returns>
	internal async Task<ProductCategory> GenerateProductCategory(Product product)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var availableProductCategories = Enum.GetValues<ProductCategory>()
								.Select(category => category.ToString()).ToList();

		try
		{
			var productCategoryCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>() {
				new SystemChatMessage("Given a product raw name, translated name and a list of categories, guess the category of the product."),
				new SystemChatMessage("Only output the category that you've came up with. For example:"),
				new UserChatMessage($"Product: rosii (tomatoes), categories: {string.Join(',', availableProductCategories)}"),
				new AssistantChatMessage("VEGETABLES"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Product: {product.RawName} ({product.GenericName}), categories: {string.Join(',', availableProductCategories)}")
				}).ConfigureAwait(false);

			if (productCategoryCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return ProductCategory.OTHER;
			}

			var productCategory = productCategoryCompletion.Value.Content[0].Text;
			var isValidProductCategory = Enum.TryParse<ProductCategory>(productCategory, out var correctProductCategory);
			return isValidProductCategory ? correctProductCategory : ProductCategory.NOT_DEFINED;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return ProductCategory.OTHER;
		}
	}

	/// <summary>
	/// Attempts to infer potential allergens for a product based on raw and translated (generic) names.
	/// </summary>
	/// <remarks>
	/// <para><b>Output Parsing:</b> Vertical bar (|) separated token list converted into <see cref="Allergen"/> instances. 'N/A' tokens are still surfaced
	/// (backlog: filter them out or map to empty result semantics).</para>
	/// <para><b>Failure Handling:</b> Returns empty collection on content filter or provider exception.</para>
	/// <para><b>Reliability:</b> Heuristic / probabilistic; upstream layers should NOT treat output as medically authoritative.</para>
	/// </remarks>
	/// <param name="product">Product context used to seed allergen inference.</param>
	/// <returns>Sequence of inferred allergens (possibly empty).</returns>
	internal async Task<IEnumerable<Allergen>> GenerateProductAllergens(Product product)
	{
		var client = openAIClient.GetChatClient("gpt-4");

		try
		{
			var productAllergensCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>() {
				new SystemChatMessage("Given a product raw name and it's translated name, guess the possible allergens of the product."),
				new SystemChatMessage("Only output the allergens that you've came up with, separated by a vertical line (|). Output 'N/A' when you cannot estimate. For example:"),
				new UserChatMessage($"Product: rosii (tomatoes)"),
				new AssistantChatMessage("N/A"),
				new UserChatMessage($"Product: lapte (milk)"),
				new AssistantChatMessage("LACTOSE | N/A"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Product: {product.RawName} ({product.GenericName})")
				}).ConfigureAwait(false);

			if (productAllergensCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return new List<Allergen>();
			}

			var productAllergensAsString = productAllergensCompletion.Value.Content[0].Text;
			var productAllergensAsList = productAllergensAsString.Split("|").ToList();

			var allergensList = new List<Allergen>();
			foreach (var allergenName in productAllergensAsList)
				allergensList.Add(new Allergen() { Name = allergenName });

			return allergensList;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return new List<Allergen>();
		}
	}
	#endregion

	#region Merchant field generation
	/// <summary>
	/// Produces a concise (target ≤ 30 chars) merchant description sourced only from merchant name context.
	/// </summary>
	/// <remarks>
	/// <para><b>Use Case:</b> UI subtitle / summary surfaces where full profile enrichment is not yet available.</para>
	/// <para><b>Failure Handling:</b> Returns empty string on filter or provider exception.</para>
	/// </remarks>
	/// <param name="merchant">Merchant whose name seeds the LLM prompt.</param>
	/// <returns>Short description or empty string.</returns>
	internal async Task<string> GenerateMerchantDescription(Merchant merchant)
	{
		var client = openAIClient.GetChatClient("gpt-4");

		try
		{
			var merchantDescriptionCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>() {
				new SystemChatMessage("Given a store merchant name, generate a short 30 character description for the merchant."),
				new SystemChatMessage("Only output the description that you've came up with. For example:"),
				new UserChatMessage("Merchant: LIDL"),
				new AssistantChatMessage("LIDL is a German supermarket chain popular in Europe")
				}).ConfigureAwait(false);

			if (merchantDescriptionCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return string.Empty;
			}

			var merchantDescription = merchantDescriptionCompletion.Value.Content[0].Text;
			return merchantDescription;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return string.Empty;
		}
	}

	/// <summary>
	/// Classifies a merchant into a <see cref="MerchantCategory"/> enum via LLM category inference.
	/// </summary>
	/// <remarks>
	/// <para><b>Parsing:</b> Attempts enum parse; returns <see cref="MerchantCategory.OTHER"/> on failure.</para>
	/// <para><b>Stability:</b> Non-deterministic; repeated calls may alter classification for ambiguous brands.</para>
	/// </remarks>
	/// <param name="merchant">Merchant (name populated) to classify.</param>
	/// <returns>Resolved merchant category or OTHER.</returns>
	internal async Task<MerchantCategory> GenerateMerchantCategory(Merchant merchant)
	{
		var client = openAIClient.GetChatClient("gpt-4");
		var availableMerchantCategories = Enum.GetValues<MerchantCategory>()
								.Select(category => category.ToString()).ToList();

		try
		{
			var merchantCategoryCompletion = await client.CompleteChatAsync(
				new List<ChatMessage>() {
				new SystemChatMessage("Given a merchant name and a list of categories, guess the category of the merchant."),
				new SystemChatMessage("Only output the category that you've came up with. For example:"),
				new UserChatMessage($"Merchant: LIDL, categories: {string.Join(',', availableMerchantCategories)}"),
				new AssistantChatMessage("SUPERMARKET"),
				new SystemChatMessage("Your turn:"),
				new UserChatMessage($"Merchant: {merchant.Name}, categories: {string.Join(',', availableMerchantCategories)}")
				}).ConfigureAwait(false);

			if (merchantCategoryCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
			{
				return MerchantCategory.OTHER;
			}

			var merchantCategory = merchantCategoryCompletion.Value.Content[0].Text;
			var isValidMerchantCategory = Enum.TryParse<MerchantCategory>(merchantCategory, out var merchantCategoryEnum);
			return isValidMerchantCategory ? merchantCategoryEnum : MerchantCategory.OTHER;
		}
		catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
		{
			return MerchantCategory.OTHER;
		}
	}
	#endregion
}
