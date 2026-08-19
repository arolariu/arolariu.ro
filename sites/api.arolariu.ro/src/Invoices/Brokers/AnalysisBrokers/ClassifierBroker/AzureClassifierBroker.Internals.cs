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

using Microsoft.Extensions.Logging;

using OpenAI.Chat;

public sealed partial class AzureClassifierBroker
{
  /// <summary>
  /// The Azure AI Foundry model deployment name used for chat completions.
  /// </summary>
  /// <remarks>
  /// <para>This constant defines the model router deployment name used across all enrichment operations.</para>
  /// <para>The "model-router" endpoint routes requests to appropriate models based on capabilities and availability.</para>
  /// </remarks>
  private const string ChatModelDeploymentName = "model-router";

  /// <summary>
  /// Maps EU 14 major allergen names to their Wikipedia article URLs for user education.
  /// </summary>
  private static readonly Dictionary<string, string> AllergenWikipediaUrls = new(StringComparer.OrdinalIgnoreCase)
  {
    ["GLUTEN"] = "https://en.wikipedia.org/wiki/Gluten-related_disorders",
    ["LACTOSE"] = "https://en.wikipedia.org/wiki/Lactose_intolerance",
    ["DAIRY"] = "https://en.wikipedia.org/wiki/Milk_allergy",
    ["EGGS"] = "https://en.wikipedia.org/wiki/Egg_allergy",
    ["NUTS"] = "https://en.wikipedia.org/wiki/Tree_nut_allergy",
    ["PEANUTS"] = "https://en.wikipedia.org/wiki/Peanut_allergy",
    ["SOY"] = "https://en.wikipedia.org/wiki/Soy_allergy",
    ["FISH"] = "https://en.wikipedia.org/wiki/Fish_allergy",
    ["SHELLFISH"] = "https://en.wikipedia.org/wiki/Shellfish_allergy",
    ["CELERY"] = "https://en.wikipedia.org/wiki/Celery#Allergy",
    ["MUSTARD"] = "https://en.wikipedia.org/wiki/Mustard_(condiment)#Allergy",
    ["SESAME"] = "https://en.wikipedia.org/wiki/Sesame#Allergies",
    ["LUPIN"] = "https://en.wikipedia.org/wiki/Lupin_bean#Allergenicity",
    ["MOLLUSCS"] = "https://en.wikipedia.org/wiki/Shellfish_allergy",
    ["SULFITES"] = "https://en.wikipedia.org/wiki/Sulfite#Health_effects",
  };

  #region Invoice field generation
  /// <summary>
  /// Generates a short humorous (3-word) invoice name using an LLM prompt over the invoice's product raw names.
  /// </summary>
  /// <remarks>
  /// <para><b>Prompt Strategy:</b> Uses structured system instructions with diverse few-shot examples to encourage creative, playful naming.</para>
  /// <para><b>Failure Handling:</b> Returns empty string when Azure OpenAI content filter triggers (<c>ChatFinishReason.ContentFilter</c>) or when a
  /// <c>ClientResultException</c> is thrown (network / provider issue). Exceptions are intentionally swallowed to preserve best-effort enrichment flow.</para>
  /// <para><b>Determinism:</b> Output is non-deterministic; upstream layers decide whether to persist or regenerate later.</para>
  /// </remarks>
  /// <param name="invoice">Source invoice whose <c>Items</c> (raw product names) seed the naming prompt (MUST NOT be null).</param>
  /// <returns>Generated three-word name or empty string on graceful degradation.</returns>
  internal async Task<string> GenerateInvoiceName(Invoice invoice)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var invoiceProducts = invoice.Items.Select(item => item.Name).ToList();
    var productList = string.Join(", ", invoiceProducts);

    try
    {
      var invoiceNameCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a creative receipt naming assistant. Given a list of products from a shopping receipt,
            generate a SHORT, FUNNY, and MEMORABLE name that captures the essence of the purchase.

            RULES:
            - Output EXACTLY 3 words (no more, no less)
            - Be creative and humorous
            - Reference the products in a clever way
            - Keep it family-friendly
            - Do NOT include quotes or punctuation at the end
            """),
          new UserChatMessage("Products: lemon, tomato, tea, flour, detergent, paper"),
          new AssistantChatMessage("Bloody Ice Tea"),
          new UserChatMessage("Products: beer, chips, pizza, soda, wings"),
          new AssistantChatMessage("Game Night Fuel"),
          new UserChatMessage("Products: diapers, baby food, wipes, formula, pacifier"),
          new AssistantChatMessage("Baby Survival Kit"),
          new UserChatMessage($"Products: {productList}")
        }).ConfigureAwait(false);

      if (invoiceNameCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        logger.LogContentFilterTriggered(nameof(GenerateInvoiceName));
        InvoiceMetrics.ContentFilterTriggered.Add(1);
        return string.Empty;
      }

      var invoiceName = invoiceNameCompletion.Value.Content[0].Text.Trim();
      return invoiceName;
    }
    catch (ClientResultException ex) // Azure Open AI is susceptible to strict content filters.
    {
      logger.LogGptMethodFailed(nameof(GenerateInvoiceName), ex.Message);
      return string.Empty;
    }
  }

  /// <summary>
  /// Generates a short (max ~7 words) invoice description derived from product names.
  /// </summary>
  /// <remarks>
  /// <para><b>Prompt Strategy:</b> Employs instructive system messages with diverse examples to guide tone and brevity.</para>
  /// <para><b>Safety:</b> Content filter or provider failures yield an empty string (no exception propagation).</para>
  /// </remarks>
  /// <param name="invoice">Invoice whose product list seeds the descriptor.</param>
  /// <returns>Concise description or empty string if generation suppressed.</returns>
  internal async Task<string> GenerateInvoiceDescription(Invoice invoice)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var invoiceProducts = invoice.Items.Select(item => item.Name).ToList();
    var productList = string.Join(", ", invoiceProducts);

    try
    {
      var invoiceDescriptionCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a receipt description writer. Given a list of products from a shopping receipt,
            generate a BRIEF and DESCRIPTIVE summary that captures what this shopping trip was about.

            RULES:
            - Maximum 7 words
            - Be descriptive yet concise
            - Can be witty but not mandatory
            - Should give context about the purchase purpose
            - Do NOT include quotes
            """),
          new UserChatMessage("Products: toilet paper, vodka, milk, beer, tomato, cucumber"),
          new AssistantChatMessage("Party prep with a healthy twist"),
          new UserChatMessage("Products: bread, eggs, butter, cheese, bacon"),
          new AssistantChatMessage("Breakfast essentials shopping run"),
          new UserChatMessage("Products: hammer, nails, paint, brush, sandpaper"),
          new AssistantChatMessage("Home renovation supplies haul"),
          new UserChatMessage($"Products: {productList}"),
        }).ConfigureAwait(false);

      if (invoiceDescriptionCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        logger.LogContentFilterTriggered(nameof(GenerateInvoiceDescription));
        InvoiceMetrics.ContentFilterTriggered.Add(1);
        return string.Empty;
      }

      var invoiceDescription = invoiceDescriptionCompletion.Value.Content[0].Text.Trim();
      return invoiceDescription;
    }
    catch (ClientResultException ex) // Azure Open AI is susceptible to strict content filters.
    {
      logger.LogGptMethodFailed(nameof(GenerateInvoiceDescription), ex.Message);
      return string.Empty;
    }
  }

  /// <summary>
  /// Generates a collection of candidate recipes derived from invoice product composition with full enrichment metadata.
  /// </summary>
  /// <remarks>
  /// <para><b>Parsing:</b> Expects recipes separated by vertical bar (|), each recipe in format: 
  /// "Name;Description;Duration;Complexity;Ingredient1,Ingredient2,..."</para>
  /// <para><b>Enrichment:</b> Populates Name, Description, ApproximateTotalDuration (minutes), 
  /// Complexity (EASY/NORMAL/HARD), and Ingredients list for each recipe.</para>
  /// <para><b>Limitations:</b> No semantic deduplication or profanity filtering is applied (backlog: post-processing module).</para>
  /// <para><b>Failure Handling:</b> Returns empty list on provider/content filter failure. Malformed recipe entries are skipped.</para>
  /// </remarks>
  /// <param name="invoice">Invoice whose product raw names seed the recipe brainstorming prompt.</param>
  /// <returns>Collection of enriched recipes (possibly empty).</returns>
  internal async Task<ICollection<Recipe>> GenerateInvoiceRecipes(Invoice invoice)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var invoiceProducts = invoice.Items.Select(item => item.Name).ToList();
    var productList = string.Join(", ", invoiceProducts);

    try
    {
      var invoiceRecipesCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a creative chef assistant. Given a list of products from a shopping receipt,
            suggest realistic RECIPES that could be made with some or all of these ingredients.

            RULES:
            - Suggest 2-5 recipes (depending on ingredient variety)
            - Each recipe should be practical and achievable
            - Consider common cooking methods and cuisines
            - Provide structured information for each recipe

            OUTPUT FORMAT (each recipe separated by |):
            RecipeName;Short description (1-2 sentences);DurationMinutes;Complexity;Ingredient1,Ingredient2,Ingredient3

            Where:
            - RecipeName: Clear, descriptive name
            - Short description: 1-2 sentences describing the dish
            - DurationMinutes: Estimated total time in minutes (cooking + prep)
            - Complexity: One of EASY, NORMAL, or HARD
            - Ingredients: Comma-separated list of main ingredients from the product list

            EXAMPLE:
            Recipe1;Description of recipe1;30;EASY;ingredient1,ingredient2|Recipe2;Description of recipe2;45;NORMAL;ingredient3,ingredient4
            """),
          new UserChatMessage("Products: parmezan, flour, tomato, rigatoni pasta, pepper, salami, minced meat"),
          new AssistantChatMessage("Classic Bolognese Pasta;A hearty Italian pasta dish with rich meat sauce and parmesan cheese;45;NORMAL;rigatoni pasta,minced meat,tomato,parmezan|Homemade Salami Pizza;A simple pizza topped with salami and fresh tomatoes;35;EASY;flour,salami,tomato,parmezan"),
          new UserChatMessage("Products: chicken breast, rice, soy sauce, ginger, garlic, broccoli"),
          new AssistantChatMessage("Teriyaki Chicken with Rice;Asian-inspired glazed chicken served over fluffy rice;30;EASY;chicken breast,rice,soy sauce,ginger,garlic|Chicken Stir Fry;Quick and healthy stir-fried chicken with vegetables;25;EASY;chicken breast,broccoli,garlic,ginger,soy sauce"),
          new UserChatMessage("Products: bread, eggs, milk, sugar, vanilla"),
          new AssistantChatMessage("Classic French Toast;Sweet breakfast dish made with egg-soaked bread;15;EASY;bread,eggs,milk,sugar,vanilla|Bread Pudding;Comforting baked dessert with custardy texture;60;NORMAL;bread,eggs,milk,sugar,vanilla"),
          new UserChatMessage($"Products: {productList}")
        }).ConfigureAwait(false);

      var invoiceRecipesAsString = invoiceRecipesCompletion.Value.Content[0].Text;
      var invoiceRecipesAsList = invoiceRecipesAsString
        .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(recipe => !string.IsNullOrWhiteSpace(recipe))
        .ToList();

      var recipesList = new List<Recipe>();
      foreach (var recipeString in invoiceRecipesAsList)
      {
        // Parse format: Name;Description;Duration;Complexity;Ingredient1,Ingredient2,...
        var parts = recipeString.Split(';', StringSplitOptions.TrimEntries);
        if (parts.Length < 5) continue; // Skip malformed entries

        var name = parts[0];
        var description = parts[1];
        var duration = int.TryParse(parts[2], out var durationValue) ? durationValue : -1;

        var complexityString = parts[3].ToUpperInvariant();
        var complexity = Enum.TryParse<RecipeComplexity>(complexityString, out var complexityEnum)
          ? complexityEnum
          : RecipeComplexity.UNKNOWN;

        var ingredients = parts[4]
          .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
          .Where(ing => !string.IsNullOrWhiteSpace(ing))
          .ToList();

        recipesList.Add(new Recipe
        {
          Name = name,
          Description = description,
          ApproximateTotalDuration = duration,
          Complexity = complexity,
          Ingredients = ingredients
        });
      }

      return recipesList;
    }
    catch (ClientResultException ex) // Azure Open AI is susceptible to strict content filters.
    {
      logger.LogGptMethodFailed(nameof(GenerateInvoiceRecipes), ex.Message);
      return [];
    }
  }
  #endregion

  #region Product field generation
  /// <summary>
  /// Attempts to infer potential allergens for a product based on raw and translated (generic) names with descriptions.
  /// </summary>
  /// <remarks>
  /// <para><b>Prompt Strategy:</b> Uses EU major allergen list as reference for consistent classification.</para>
  /// <para><b>Output Parsing:</b> Format "AllergenName:Description" separated by vertical bar (|).</para>
  /// <para><b>Enrichment:</b> Populates both allergen Name and Description for UI tooltips and accessibility.</para>
  /// <para><b>Filtering:</b> Automatically filters out 'N/A', 'NONE', and empty tokens.</para>
  /// <para><b>Reliability:</b> Heuristic / probabilistic; upstream layers should NOT treat output as medically authoritative.</para>
  /// </remarks>
  /// <param name="product">Product context used to seed allergen inference.</param>
  /// <returns>Sequence of inferred allergens with descriptions (possibly empty).</returns>
  internal async Task<IEnumerable<Allergen>> GenerateProductAllergens(Product product)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);

    try
    {
      var productAllergensCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a food allergen identification assistant. Based on the product name,
            identify POTENTIAL allergens that may be present.

            COMMON ALLERGENS TO CONSIDER (EU Major 14):
            - GLUTEN: Wheat, barley, rye, oats products
            - LACTOSE/DAIRY: Milk, cheese, butter, cream products
            - EGGS: Egg-containing products
            - NUTS: Tree nuts (almonds, walnuts, hazelnuts, etc.)
            - PEANUTS: Peanut products (separate from tree nuts)
            - SOY: Soy-based products
            - FISH: Fish products
            - SHELLFISH: Crustaceans, mollusks
            - SESAME: Sesame seeds and oil
            - CELERY: Celery products
            - MUSTARD: Mustard products
            - SULFITES: Wine, dried fruits, some preservatives

            RULES:
            - Output allergens separated by vertical bar (|)
            - For each allergen, provide: AllergenName:Short one-sentence description
            - If NO allergens likely, output EXACTLY: NONE
            - Be conservative - only list allergens likely to be present
            - Consider common ingredients in the product type
            - Keep descriptions concise (max 15 words)

            OUTPUT FORMAT: ALLERGEN1:Description for allergen1 | ALLERGEN2:Description for allergen2  OR  NONE
            """),
          new UserChatMessage("Product: rosii (tomatoes)"),
          new AssistantChatMessage("NONE"),
          new UserChatMessage("Product: lapte (milk)"),
          new AssistantChatMessage("LACTOSE:A milk sugar that can cause digestive issues in intolerant individuals | DAIRY:Milk-based products that may trigger allergic reactions"),
          new UserChatMessage("Product: paine alba (white bread)"),
          new AssistantChatMessage("GLUTEN:A protein found in wheat that can cause celiac disease"),
          new UserChatMessage("Product: inghetata cu alune (hazelnut ice cream)"),
          new AssistantChatMessage("LACTOSE:A milk sugar that can cause digestive issues | DAIRY:Milk-based products that may trigger reactions | NUTS:Tree nuts that can cause severe allergic reactions"),
          new UserChatMessage("Product: biscuiti cu ciocolata (chocolate cookies)"),
          new AssistantChatMessage("GLUTEN:A protein found in wheat flour | DAIRY:Milk products in chocolate or dough | EGGS:Common baking ingredient that may cause allergies | SOY:Often present in chocolate or as lecithin"),
          new UserChatMessage($"Product: {product.Name}")
        }).ConfigureAwait(false);

      if (productAllergensCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        logger.LogContentFilterTriggeredWithContext(nameof(GenerateProductAllergens), product.Name);
        InvoiceMetrics.ContentFilterTriggered.Add(1);
        return [];
      }

      var productAllergensAsString = productAllergensCompletion.Value.Content[0].Text;

      // Filter out N/A, NONE, and empty entries
      var productAllergensAsList = productAllergensAsString
        .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(allergen => !string.IsNullOrWhiteSpace(allergen)
                          && !allergen.Equals("N/A", StringComparison.OrdinalIgnoreCase)
                          && !allergen.Equals("NONE", StringComparison.OrdinalIgnoreCase))
        .ToList();

      var allergensList = new List<Allergen>();
      foreach (var allergenEntry in productAllergensAsList)
      {
        // Parse format: AllergenName:Description
        var parts = allergenEntry.Split(':', 2, StringSplitOptions.TrimEntries);
        var allergenName = parts[0].Trim().ToUpperInvariant();
        var allergenDescription = parts.Length > 1 ? parts[1].Trim() : string.Empty;

        // Filter out hallucinated/sentence-like allergen names
        if (allergenName.Length > 20 || allergenName.Split(' ').Length > 2)
          continue;

        // Filter out sentence-like outputs (hallucinations)
        if (allergenName.Contains("NEED", StringComparison.OrdinalIgnoreCase) ||
            allergenName.Contains("IDENTIFY", StringComparison.OrdinalIgnoreCase) ||
            allergenName.Contains("PRODUCT", StringComparison.OrdinalIgnoreCase) ||
            allergenName.Contains("POTENTIAL", StringComparison.OrdinalIgnoreCase))
        {
          logger.LogAllergenHallucinationSkipped(allergenName);
          continue;
        }

        // Whitelist validation — only accept known EU 14 allergens
        if (!AllergenWikipediaUrls.ContainsKey(allergenName))
        {
          logger.LogAllergenUnrecognizedSkipped(allergenName, product.Name);
          continue;
        }

        var wikiUrl = AllergenWikipediaUrls.TryGetValue(allergenName, out var url)
          ? new Uri(url)
          : new Uri("https://arolariu.ro");

        allergensList.Add(new Allergen
        {
          Name = allergenName,
          Description = allergenDescription,
          LearnMoreAddress = wikiUrl,
        });
      }

      // Deduplicate by allergen name (case-insensitive)
      allergensList = allergensList
        .GroupBy(a => a.Name, StringComparer.OrdinalIgnoreCase)
        .Select(g => g.First())
        .ToList();

      return allergensList;
    }
    catch (ClientResultException ex) // Azure Open AI is susceptible to strict content filters.
    {
      logger.LogGptMethodFailedWithContext(nameof(GenerateProductAllergens), product.Name, ex.Message);
      return [];
    }
  }
  #endregion

  #region Merchant field generation
  /// <summary>
  /// Produces a concise (target ≤ 50 chars) merchant description sourced only from merchant name context.
  /// </summary>
  /// <remarks>
  /// <para><b>Prompt Strategy:</b> Uses structured system instructions with examples of well-known and regional merchants.</para>
  /// <para><b>Use Case:</b> UI subtitle / summary surfaces where full profile enrichment is not yet available.</para>
  /// <para><b>Failure Handling:</b> Returns empty string on filter or provider exception.</para>
  /// </remarks>
  /// <param name="merchant">Merchant whose name seeds the LLM prompt.</param>
  /// <returns>Short description or empty string.</returns>
  internal async Task<string> GenerateMerchantDescription(Merchant merchant)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);

    try
    {
      var merchantDescriptionCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a merchant identification assistant. Given a store/merchant name,
            generate a BRIEF description that helps identify what kind of business it is.

            RULES:
            - Maximum 50 characters
            - Include the type of business (supermarket, pharmacy, etc.)
            - Can include country of origin for international brands
            - Be factual and informative
            - If the merchant is unknown, describe what it might be based on the name
            - Do NOT include quotes
            """),
          new UserChatMessage("Merchant: LIDL"),
          new AssistantChatMessage("German discount supermarket chain"),
          new UserChatMessage("Merchant: Kaufland"),
          new AssistantChatMessage("German hypermarket chain"),
          new UserChatMessage("Merchant: Mega Image"),
          new AssistantChatMessage("Romanian supermarket chain"),
          new UserChatMessage("Merchant: eMAG"),
          new AssistantChatMessage("Romanian online electronics retailer"),
          new UserChatMessage("Merchant: Catena"),
          new AssistantChatMessage("Romanian pharmacy chain"),
          new UserChatMessage($"Merchant: {merchant.Name}")
        }).ConfigureAwait(false);

      if (merchantDescriptionCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        logger.LogContentFilterTriggeredWithContext(nameof(GenerateMerchantDescription), merchant.Name);
        InvoiceMetrics.ContentFilterTriggered.Add(1);
        return string.Empty;
      }

      var merchantDescription = merchantDescriptionCompletion.Value.Content[0].Text.Trim();
      return merchantDescription;
    }
    catch (ClientResultException ex) // Azure Open AI is susceptible to strict content filters.
    {
      logger.LogGptMethodFailedWithContext(nameof(GenerateMerchantDescription), merchant.Name, ex.Message);
      return string.Empty;
    }
  }


  /// <summary>
  /// Infers the receipt type from product context when OCR doesn't detect it.
  /// </summary>
  /// <remarks>
  /// <para><b>Purpose:</b> Provides GPT fallback for empty <c>ReceiptType</c> field from Document Intelligence.</para>
  /// <para><b>Prompt Strategy:</b> Uses product names to classify receipt into standard types (Itemized, Meal, Gas, Parking, Hotel, Other).</para>
  /// <para><b>Failure Handling:</b> Returns empty string on provider/content filter failure (best-effort enrichment).</para>
  /// <para><b>Integration:</b> Called from Batch 4 fallback in <see cref="PerformGptAnalysisOnSingleInvoice"/> when <c>invoice.ReceiptType</c> is empty.</para>
  /// </remarks>
  /// <param name="invoice">Invoice whose product raw names seed the classification prompt.</param>
  /// <returns>Receipt type string (e.g., "Itemized", "Meal") or empty string on failure.</returns>
  internal async Task<string> GenerateReceiptType(Invoice invoice)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var productList = string.Join(", ", invoice.Items.Select(i => i.Name));

    try
    {
      var completion = await client.CompleteChatAsync(
        new List<ChatMessage>()
        {
          new SystemChatMessage(
            """
            You are a receipt classification assistant. Based on the products listed,
            determine the receipt type.
            
            TYPES (output EXACTLY one):
            - Itemized (standard retail/grocery receipt with line items)
            - Meal (restaurant, fast food, café)
            - Gas (fuel station)
            - Parking (parking lot/garage)
            - Hotel (accommodation)
            - Other (none of the above)
            
            Output ONLY the type name, nothing else.
            """),
          new UserChatMessage("Products: milk, bread, eggs, cheese, butter"),
          new AssistantChatMessage("Itemized"),
          new UserChatMessage("Products: burger, fries, coke, ketchup"),
          new AssistantChatMessage("Meal"),
          new UserChatMessage($"Products: {productList}")
        }).ConfigureAwait(false);

      return completion.Value.Content[0].Text.Trim();
    }
    catch (ClientResultException ex)
    {
      logger.LogGptMethodFailed(nameof(GenerateReceiptType), ex.Message);
      return string.Empty;
    }
  }

  /// <summary>
  /// Infers the country/region from product names and currency when OCR doesn't detect it.
  /// </summary>
  /// <remarks>
  /// <para><b>Purpose:</b> Provides GPT fallback for empty <c>CountryRegion</c> field from Document Intelligence.</para>
  /// <para><b>Prompt Strategy:</b> Uses product names (local language hints) and currency code to infer ISO 3166-1 alpha-2 country code.</para>
  /// <para><b>Failure Handling:</b> Returns empty string on provider/content filter failure (best-effort enrichment).</para>
  /// <para><b>Integration:</b> Called from Batch 4 fallback in <see cref="PerformGptAnalysisOnSingleInvoice"/> when <c>invoice.CountryRegion</c> is empty.</para>
  /// </remarks>
  /// <param name="invoice">Invoice whose product names and currency seed the geographic inference.</param>
  /// <returns>ISO 3166-1 alpha-2 country code (e.g., "RO", "US") or empty string on failure.</returns>
  internal async Task<string> GenerateCountryRegion(Invoice invoice)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var productList = string.Join(", ", invoice.Items.Select(i => i.Name));
    var currencyCode = invoice.PaymentInformation.Currency.Code;

    try
    {
      var completion = await client.CompleteChatAsync(
        new List<ChatMessage>()
        {
          new SystemChatMessage(
            $"""
            You are a geographic classifier. Based on product names (which may be in a local language)
            and the currency used ({currencyCode}), determine the country where this receipt was issued.
            
            Output ONLY the ISO 3166-1 alpha-2 country code (e.g., RO, US, DE, FR).
            If uncertain, output the most likely country based on the currency.
            """),
          new UserChatMessage("Products: lapte, paine, oua | Currency: RON"),
          new AssistantChatMessage("RO"),
          new UserChatMessage("Products: milk, bread, eggs | Currency: USD"),
          new AssistantChatMessage("US"),
          new UserChatMessage($"Products: {productList} | Currency: {currencyCode}")
        }).ConfigureAwait(false);

      return completion.Value.Content[0].Text.Trim();
    }
    catch (ClientResultException ex)
    {
      logger.LogGptMethodFailed(nameof(GenerateCountryRegion), ex.Message);
      return string.Empty;
    }
  }
  #endregion
}
