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
  /// <summary>
  /// The Azure OpenAI model deployment name used for chat completions.
  /// </summary>
  /// <remarks>
  /// <para>This constant defines the GPT-4 model deployment name used across all enrichment operations.</para>
  /// <para>Change this value to switch to a different model deployment (e.g., "gpt-4-turbo", "gpt-4o").</para>
  /// </remarks>
  private const string ChatModelDeploymentName = "gpt-4";

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
    var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();
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
        return string.Empty;
      }

      var invoiceName = invoiceNameCompletion.Value.Content[0].Text.Trim();
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
  /// <para><b>Prompt Strategy:</b> Employs instructive system messages with diverse examples to guide tone and brevity.</para>
  /// <para><b>Safety:</b> Content filter or provider failures yield an empty string (no exception propagation).</para>
  /// </remarks>
  /// <param name="invoice">Invoice whose product list seeds the descriptor.</param>
  /// <returns>Concise description or empty string if generation suppressed.</returns>
  internal async Task<string> GenerateInvoiceDescription(Invoice invoice)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();
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
        return string.Empty;
      }

      var invoiceDescription = invoiceDescriptionCompletion.Value.Content[0].Text.Trim();
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
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var productCategories = invoice.Items.Select(item => item.Category.ToString()).ToList();
    var productCategoryList = string.Join(", ", productCategories);

    try
    {
      var invoiceCategoryCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>()
        {
          new SystemChatMessage(
            $"""
            You are a receipt categorization assistant. Given a list of product categories from a receipt,
            determine the SINGLE best category for the entire receipt.

            AVAILABLE CATEGORIES (choose EXACTLY one):
            - NOT_DEFINED: Use only if you truly cannot determine the category
            - GROCERY: General food and household grocery shopping
            - FAST_FOOD: Ready-to-eat or takeaway food items
            - HOME_CLEANING: Cleaning supplies and home maintenance
            - CAR_AUTO: Automotive parts, fuel, or car-related items
            - OTHER: Use when no other category fits

            RULES:
            - Output ONLY the category name in UPPERCASE
            - Choose based on the MAJORITY of products
            - When products are mixed, choose the dominant category
            - Do NOT include any explanation
            """),
          new UserChatMessage("Product categories: DAIRY, BEVERAGES, VEGETABLES, MEAT, BAKED_GOODS"),
          new AssistantChatMessage("GROCERY"),
          new UserChatMessage("Product categories: CLEANING_SUPPLIES, CLEANING_SUPPLIES, PERSONAL_CARE"),
          new AssistantChatMessage("HOME_CLEANING"),
          new UserChatMessage("Product categories: BEVERAGES, BAKED_GOODS, MEAT"),
          new AssistantChatMessage("FAST_FOOD"),
          new UserChatMessage($"Product categories: {productCategoryList}")
        }).ConfigureAwait(false);

      if (invoiceCategoryCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        return InvoiceCategory.OTHER;
      }

      var invoiceCategory = invoiceCategoryCompletion.Value.Content[0].Text.Trim().ToUpperInvariant();
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
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);
    var invoiceProducts = invoice.Items.Select(item => item.RawName).ToList();
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
            - Each recipe name should be clear and descriptive
            - Recipes should be practical and achievable
            - Consider common cooking methods and cuisines
            - Separate recipe names with a vertical bar (|)
            - Do NOT include numbers or bullets
            - Do NOT include preparation instructions, just names

            OUTPUT FORMAT: Recipe One | Recipe Two | Recipe Three
            """),
          new UserChatMessage("Products: parmezan, flour, tomato, rigatoni pasta, pepper, salami, minced meat"),
          new AssistantChatMessage("Classic Bolognese Pasta | Homemade Salami Pizza | Stuffed Rigatoni with Parmesan"),
          new UserChatMessage("Products: chicken breast, rice, soy sauce, ginger, garlic, broccoli"),
          new AssistantChatMessage("Teriyaki Chicken with Rice | Chicken Stir Fry | Garlic Ginger Chicken"),
          new UserChatMessage("Products: bread, eggs, milk, sugar, vanilla"),
          new AssistantChatMessage("Classic French Toast | Vanilla Custard | Bread Pudding"),
          new UserChatMessage($"Products: {productList}")
        }).ConfigureAwait(false);

      var invoiceRecipesAsString = invoiceRecipesCompletion.Value.Content[0].Text;
      var invoiceRecipesAsList = invoiceRecipesAsString
        .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(name => !string.IsNullOrWhiteSpace(name))
        .ToList();

      var recipesList = new List<Recipe>();
      foreach (var recipeName in invoiceRecipesAsList)
      {
        recipesList.Add(new Recipe() { Name = recipeName.Trim() });
      }

      return recipesList;
    }
    catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
    {
      return [];
    }
  }
  #endregion

  #region Product field generation
  /// <summary>
  /// Classifies a single product into a <see cref="ProductCategory"/> via LLM prompt using raw + generic names.
  /// </summary>
  /// <remarks>
  /// <para><b>Prompt Strategy:</b> Uses comprehensive category descriptions with diverse examples for accurate classification.</para>
  /// <para><b>Enum Resolution:</b> Attempts direct parse; returns <see cref="ProductCategory.NOT_DEFINED"/> when parse fails.</para>
  /// <para><b>Fallback:</b> Returns <see cref="ProductCategory.OTHER"/> on filter / provider failure.</para>
  /// </remarks>
  /// <param name="product">Product value object (raw and generic names populated).</param>
  /// <returns>Resolved category; OTHER / NOT_DEFINED fallback.</returns>
  internal async Task<ProductCategory> GenerateProductCategory(Product product)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);

    try
    {
      var productCategoryCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a product classification assistant. Categorize the given product into ONE of these categories:

            CATEGORIES:
            - NOT_DEFINED: Cannot determine category
            - BAKED_GOODS: Bread, pastries, cakes, cookies, confectionery
            - GROCERIES: General pantry staples, spices, condiments, canned goods
            - DAIRY: Milk, cheese, yogurt, butter, cream
            - MEAT: Beef, pork, chicken, turkey, processed meats (sausages, bacon)
            - FISH: Fresh fish, seafood, shellfish, canned fish
            - FRUITS: Fresh, dried, or frozen fruits
            - VEGETABLES: Fresh, frozen, or canned vegetables
            - BEVERAGES: Water, juices, soft drinks, tea, coffee, energy drinks
            - ALCOHOLIC_BEVERAGES: Beer, wine, spirits, liquor
            - TOBACCO: Cigarettes, tobacco products
            - CLEANING_SUPPLIES: Detergents, cleaners, disinfectants
            - PERSONAL_CARE: Soap, shampoo, toothpaste, cosmetics
            - MEDICINE: Pharmaceuticals, vitamins, health supplements
            - OTHER: Anything that doesn't fit above categories

            RULES:
            - Output ONLY the category name in UPPERCASE with underscores
            - Consider both the raw name and translated name
            - Choose the most specific category that applies
            """),
          new UserChatMessage("Product: rosii (tomatoes)"),
          new AssistantChatMessage("VEGETABLES"),
          new UserChatMessage("Product: lapte zuzu (zuzu milk)"),
          new AssistantChatMessage("DAIRY"),
          new UserChatMessage("Product: paine alba (white bread)"),
          new AssistantChatMessage("BAKED_GOODS"),
          new UserChatMessage("Product: coca cola 500ml"),
          new AssistantChatMessage("BEVERAGES"),
          new UserChatMessage("Product: domestos (domestos cleaner)"),
          new AssistantChatMessage("CLEANING_SUPPLIES"),
          new UserChatMessage($"Product: {product.RawName} ({product.GenericName})")
        }).ConfigureAwait(false);

      if (productCategoryCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        return ProductCategory.OTHER;
      }

      var productCategory = productCategoryCompletion.Value.Content[0].Text.Trim().ToUpperInvariant();
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
  /// <para><b>Prompt Strategy:</b> Uses EU major allergen list as reference for consistent classification.</para>
  /// <para><b>Output Parsing:</b> Vertical bar (|) separated token list converted into <see cref="Allergen"/> instances.</para>
  /// <para><b>Filtering:</b> Automatically filters out 'N/A', 'NONE', and empty tokens.</para>
  /// <para><b>Reliability:</b> Heuristic / probabilistic; upstream layers should NOT treat output as medically authoritative.</para>
  /// </remarks>
  /// <param name="product">Product context used to seed allergen inference.</param>
  /// <returns>Sequence of inferred allergens (possibly empty).</returns>
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
            - If NO allergens likely, output EXACTLY: NONE
            - Be conservative - only list allergens likely to be present
            - Consider common ingredients in the product type
            - Do NOT include explanations

            OUTPUT FORMAT: ALLERGEN1 | ALLERGEN2  OR  NONE
            """),
          new UserChatMessage("Product: rosii (tomatoes)"),
          new AssistantChatMessage("NONE"),
          new UserChatMessage("Product: lapte (milk)"),
          new AssistantChatMessage("LACTOSE | DAIRY"),
          new UserChatMessage("Product: paine alba (white bread)"),
          new AssistantChatMessage("GLUTEN"),
          new UserChatMessage("Product: inghetata cu alune (hazelnut ice cream)"),
          new AssistantChatMessage("LACTOSE | DAIRY | NUTS"),
          new UserChatMessage("Product: biscuiti cu ciocolata (chocolate cookies)"),
          new AssistantChatMessage("GLUTEN | DAIRY | EGGS | SOY"),
          new UserChatMessage($"Product: {product.RawName} ({product.GenericName})")
        }).ConfigureAwait(false);

      if (productAllergensCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
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
      foreach (var allergenName in productAllergensAsList)
      {
        allergensList.Add(new Allergen() { Name = allergenName.Trim().ToUpperInvariant() });
      }

      return allergensList;
    }
    catch (ClientResultException) // Azure Open AI is susceptible to strict content filters.
    {
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
        return string.Empty;
      }

      var merchantDescription = merchantDescriptionCompletion.Value.Content[0].Text.Trim();
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
  /// <para><b>Prompt Strategy:</b> Uses structured category descriptions with examples of well-known retailers.</para>
  /// <para><b>Parsing:</b> Attempts enum parse; returns <see cref="MerchantCategory.OTHER"/> on failure.</para>
  /// <para><b>Stability:</b> Non-deterministic; repeated calls may alter classification for ambiguous brands.</para>
  /// </remarks>
  /// <param name="merchant">Merchant (name populated) to classify.</param>
  /// <returns>Resolved merchant category or OTHER.</returns>
  internal async Task<MerchantCategory> GenerateMerchantCategory(Merchant merchant)
  {
    var client = openAIClient.GetChatClient(ChatModelDeploymentName);

    try
    {
      var merchantCategoryCompletion = await client.CompleteChatAsync(
        new List<ChatMessage>() {
          new SystemChatMessage(
            """
            You are a merchant categorization assistant. Classify the merchant into ONE of these categories:

            CATEGORIES:
            - NOT_DEFINED: Cannot determine the category
            - LOCAL_SHOP: Small independent local stores, corner shops, convenience stores
            - SUPERMARKET: Medium-sized grocery stores (Lidl, Aldi, Mega Image, Profi)
            - HYPERMARKET: Large stores with wide variety (Carrefour, Kaufland, Auchan, Cora)
            - ONLINE_SHOP: E-commerce retailers (Amazon, eMAG, Altex online)
            - OTHER: Gas stations, pharmacies, restaurants, or anything that doesn't fit above

            RULES:
            - Output ONLY the category name in UPPERCASE with underscores
            - Consider the size and type of business
            - Chain stores are typically SUPERMARKET or HYPERMARKET
            - Do NOT include any explanation
            """),
          new UserChatMessage("Merchant: LIDL"),
          new AssistantChatMessage("SUPERMARKET"),
          new UserChatMessage("Merchant: Carrefour"),
          new AssistantChatMessage("HYPERMARKET"),
          new UserChatMessage("Merchant: eMAG"),
          new AssistantChatMessage("ONLINE_SHOP"),
          new UserChatMessage("Merchant: Alimentara La Bunica"),
          new AssistantChatMessage("LOCAL_SHOP"),
          new UserChatMessage("Merchant: OMV"),
          new AssistantChatMessage("OTHER"),
          new UserChatMessage($"Merchant: {merchant.Name}")
        }).ConfigureAwait(false);

      if (merchantCategoryCompletion.Value.FinishReason == ChatFinishReason.ContentFilter)
      {
        return MerchantCategory.OTHER;
      }

      var merchantCategory = merchantCategoryCompletion.Value.Content[0].Text.Trim().ToUpperInvariant();
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
