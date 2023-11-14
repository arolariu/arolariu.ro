using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.Contracts;
using Azure.AI.OpenAI;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

public partial class AzureOpenAiBroker
{
    /// <inheritdoc/>
    public async Task<IEnumerable<Allergen>> GeneratePossibleAllergens(Product product)
    {
        var invoiceItemsNamesAsString = string.Join("\n", product?.GenericName);
        var invoicePossibleAllergensPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "Generate a list of all the allergens that POSSIBLY can be in this invoice. Output ONLY the generated allergens.";

        var context = CreateContextListForAllergens();
        context.Add(new ChatMessage(ChatRole.User, invoicePossibleAllergensPrompt));

        var chatOptions = new ChatCompletionsOptions(context);
        ConfigureChatOptions(chatOptions, 0.5f, 10_000, 0, 0, 1);

        var invoicePossibleAllergensCompletion = await openAIClient
            .GetChatCompletionsAsync(model, chatOptions)
            .ConfigureAwait(false);

        var allergensList = invoicePossibleAllergensCompletion.Value.Choices[0].Message.Content.Split(',')
            .Select(allergen => new Allergen(allergen))
            .ToList();

        return allergensList;
    }

    /// <inheritdoc/>
    public async Task<string> GenerateItemGenericName(string itemName)
    {
        var itemGenericNamePrompt = $"This item is locally called as `{itemName}`." +
            "Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name.";

        var context = CreateContextListForProductGenericName();
        context.Add(new ChatMessage(ChatRole.User, itemGenericNamePrompt));

        var chatOptions = new ChatCompletionsOptions(context);
        ConfigureChatOptions(chatOptions, 1f, 10_000, 0, 0, 1);

        var itemGenericNameCompletion = await openAIClient
            .GetChatCompletionsAsync(model, chatOptions)
            .ConfigureAwait(false);

        var genericName = itemGenericNameCompletion.Value.Choices[0].Message.Content;
        return genericName;
    }

    /// <inheritdoc/>
    public async Task<ProductCategory> GenerateItemCategory(string itemName)
    {
        var itemCategoryPrompt = $"This item is locally called as `{itemName}`." +
            "From the given list of item categories, please try, as much as possible, to find an adequate category for this item. Output ONLY the generated category.";

        var context = CreateContextListForProductCategory();
        context.Add(new ChatMessage(ChatRole.User, itemCategoryPrompt));

        var chatOptions = new ChatCompletionsOptions(context);
        ConfigureChatOptions(chatOptions, 1f, 10_000, 0, 0, 1);

        var itemCategoryCompletion = await openAIClient
            .GetChatCompletionsAsync(model, chatOptions)
            .ConfigureAwait(false);

        var productCategory = itemCategoryCompletion.Value.Choices[0].Message.Content;
        return Enum.Parse<ProductCategory>(productCategory);
    }
}
