using arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;

using Azure;
using Azure.AI.OpenAI;

using Microsoft.Extensions.Configuration;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

/// <summary>
/// The Azure OpenAI broker service.
/// </summary>
public class AzureOpenAiBroker
{
    private readonly string model = "gpt-turbo";
    private readonly OpenAIClient openAIClient;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public AzureOpenAiBroker(IConfiguration configuration)
    {
        var openAiEndpoint = configuration["Azure:OpenAI:EndpointName"]
            ?? throw new ArgumentNullException(nameof(configuration));

        var openAiKey = configuration["Azure:OpenAI:EndpointKey"]
            ?? throw new ArgumentNullException(nameof(configuration));

        openAIClient = new OpenAIClient(
            new Uri(openAiEndpoint),
            new AzureKeyCredential(openAiKey));
    }

    /// <summary>
    /// This method will generate and populate the Invoice `Description` property.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async Task<ChatCompletions> GenerateInvoiceDescription(Invoice invoice)
    {
        IList<string> invoiceItemsNamesAsList;
        if (invoice.Items.Select(item => item.GenericName).Any(name => string.IsNullOrEmpty(name)))
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.RawName).ToList();
        }
        else
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.GenericName).ToList();
        }

        var invoiceItemsNamesAsString = string.Join("\n", invoiceItemsNamesAsList);
        var invoiceDescriptionPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "Generate a simple, human-readable, 30 characters long description for this invoice. Output ONLY the generated description.";

        var chatMessages = new List<ChatMessage>()
        {
            new ChatMessage(ChatRole.System, @"You are a specialized AI assistant that has immense knowledge of the food industry. You are an expert at identifying products bought from stores. You will be tasked with generating a fun and friendly short text about the bought products from an invoice. You need to respect the user prompt and ONLY respond back with what the user requests. There is no need to offer more context or additional phrasing - as your responses need to be short and succint. Here are some examples of interactions with the user:"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                MONSTER ENERGY ULTRA
                SESAME BREAD 750G

                Generate a simple, human-readable, 30 characters long description for this invoice. Output ONLY the generated description."),
            new ChatMessage(ChatRole.Assistant, @"Energy, carbs and toilet paper!"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                PUDDING HAZELNUT
                MONSTER ENERGY ULTRA
                MONSTER ULTRA GOLD
                MONSTER ULTRA PARADISE
                GELATO HASSELNÖT
                DRICKKVARG KOK/ANAN

                Generate a simple, human-readable, 30 characters long description for this invoice. Output ONLY the generated description."),
            new ChatMessage(ChatRole.Assistant, @"Sweeth tooth of energy!"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                CLEANING GLOVES
                DISHWASHING LIQUID

                Generate a simple, human-readable, 30 characters long description for this invoice. Output ONLY the generated description."),
            new ChatMessage(ChatRole.User, @"Cleaning day! Wash wash!"),
            new ChatMessage(ChatRole.System, "Now it's your turn... Here is the user input:"),
            new ChatMessage(ChatRole.User, invoiceDescriptionPrompt)
        };

        var chatOptions = new ChatCompletionsOptions(chatMessages)
        {
            Temperature = (float)1.3,
            MaxTokens = 10000,
            FrequencyPenalty = 0,
            PresencePenalty = 0,
            ChoiceCount = 1,
        };

        var invoiceDescriptionCompletion =
            await openAIClient.GetChatCompletionsAsync(model, chatOptions);

        return invoiceDescriptionCompletion.Value;
    }

    /// <summary>
    /// This method will generate and populate the Invoice `PossibleReceipts` property.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async Task<ChatCompletions> GeneratePossibleRecipes(Invoice invoice)
    {
        IList<string> invoiceItemsNamesAsList;
        if (invoice.Items.Select(item => item.GenericName).Any(name => string.IsNullOrEmpty(name)))
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.RawName).ToList();
        }
        else
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.GenericName).ToList();
        }

        var invoiceItemsNamesAsString = string.Join("\n", invoiceItemsNamesAsList);
        var invoicePossibleReceiptsPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "Generate a list of maximum 3 possible recipes for this invoice. Output ONLY the generated recipes.";

        var chatMessages = new List<ChatMessage>()
        {
            new ChatMessage(ChatRole.System, @"You are a specialized AI assistant that has immense knowledge of the food industry. You are an expert at identifying products bought from stores. You will be tasked with generating recipes from invoices that contain a list of bought items. You need to respect the user prompt and ONLY respond back with what the user requests. There is no need to offer more context or additional phrasing - as your responses need to be short and succint. Your responses will be fed to another system, so please respect this requirement. Here are some examples of your interactions with the user:"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                MONSTER ENERGY ULTRA
                PASTA FETTUCINI 500G
                SAN MARZANO TOMATOES 400G
                PARMIGIANO REGGIANO 250G

                Generate a list of maximum 3 possible recipes for this invoice. Output ONLY the generated recipes."),
            new ChatMessage(ChatRole.Assistant, @"Spaghetti Pomodoro al Parmigiano Reggiano, Tagliatelle with Tomato and Parmigiano Reggiano, Pasta Arraganata (baked pasta with San Marzano tomatoes"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                PAPRIKA POWDER 100G
                MAYONNAISE 500ML
                WHITE POTATOES 1KG
                PARMIGIANO REGGIANO 250G
                SAN MARZANO TOMATOES 400G
                PASTA FETTUCINI 500G
                SPAGHETTI 500G

                Generate a list of maximum 3 possible recipes for this invoice. Output ONLY the generated recipes."),
            new ChatMessage(ChatRole.Assistant, @"Spaghetti Pomodoro al Parmigiano Reggiano, Potato Salad with Paprika, Potatoes au Gratin with Parmigiano Reggiano"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                CLEANING GLOVES
                DISHWASHING LIQUID

                Generate a list of maximum 3 possible recipes for this invoice. Output ONLY the generated recipes."),
            new ChatMessage(ChatRole.User, @"No recipes could be identified for the provided items."),
            new ChatMessage(ChatRole.System, "Now it's your turn... Here is the user input:"),
            new ChatMessage(ChatRole.User, invoicePossibleReceiptsPrompt)
        };

        var chatOptions = new ChatCompletionsOptions(chatMessages)
        {
            Temperature = (float)0.5,
            MaxTokens = 10000,
            FrequencyPenalty = 0,
            PresencePenalty = 0,
            ChoiceCount = 1,
        };

        var invoicePossibleReceiptsCompletion =
            await openAIClient.GetChatCompletionsAsync(model, chatOptions);

        return invoicePossibleReceiptsCompletion.Value;
    }

    /// <summary>
    /// This method will generate and populate the Invoice `PossibleAllergens` property.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async Task<ChatCompletions> GeneratePossibleAllergens(Invoice invoice)
    {
        IList<string> invoiceItemsNamesAsList;
        if (invoice.Items.Select(item => item.GenericName).Any(name => string.IsNullOrEmpty(name)))
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.RawName).ToList();
        }
        else
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.GenericName).ToList();
        }

        var invoiceItemsNamesAsString = string.Join("\n", invoiceItemsNamesAsList);
        var invoicePossibleAllergensPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "Generate a list of all the allergens that POSSIBLY can be in this invoice. Output ONLY the generated allergens.";

        var chatMessages = new List<ChatMessage>()
        {
            new ChatMessage(ChatRole.System, @"You are a specialized AI assistant that has immense knowledge of the food industry and each food item that exists. You are an expert at identifying allergens from products bought from stores. You will be tasked with identifying all possible allergens from a list of items. You need to respect the user prompt and ONLY respond back with what the user requests. There is no need to offer more context or additional phrasing - as your responses need to be short and succint so that they can be fed successfully to another system. Here are some examples of interactions with the user:"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                MONSTER ENERGY ULTRA
                PASTA FETTUCINI
                SAN MARZANO TOMATOES
                PARMIGIANO REGGIANO

                Generate a list of all the allergens that POSSIBLY can be in this invoice. Output ONLY the generated allergens."),
            new ChatMessage(ChatRole.Assistant, @"Caffeine, Gluten, Milk, Eggs, Wheat, Soy"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                PAPRIKA POWDER
                MAYONNAISE 
                WHITE POTATOES
                PARMIGIANO REGGIANO
                SAN MARZANO TOMATOES
                PASTA FETTUCINI
                SPAGHETTI
                BREAD WITH SEEDS

                Generate a list of all the allergens that POSSIBLY can be in this invoice. Output ONLY the generated allergens."),
            new ChatMessage(ChatRole.User, @"Caffeine, Gluten, Milk, Eggs, Wheat, Soy, Mustard, Sulfites, Lupin, Sesame"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                CLEANING GLOVES
                DISHWASHING LIQUID

                Generate a list of all the allergens that POSSIBLY can be in this invoice. Output ONLY the generated allergens."),
            new ChatMessage(ChatRole.User, @"No allergens could be determined from this invoice."),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                CLEANING GLOVES
                DISHWASHING LIQUID
                BREAD WITH SEEDS

                Generate a list of all the allergens that POSSIBLY can be in this invoice. Output ONLY the generated allergens."),
            new ChatMessage(ChatRole.User, @"Sesame, nuts, other seeds."),
            new ChatMessage(ChatRole.System, "Now it's your turn... Here is the user input:"),
            new ChatMessage(ChatRole.User, invoicePossibleAllergensPrompt)
        };

        var chatOptions = new ChatCompletionsOptions(chatMessages)
        {
            Temperature = (float)0.5,
            MaxTokens = 10000,
            FrequencyPenalty = 0,
            PresencePenalty = 0,
            ChoiceCount = 1,
        };


        var invoicePossibleAllergensCompletion =
            await openAIClient.GetChatCompletionsAsync(model, chatOptions);

        return invoicePossibleAllergensCompletion.Value;
    }

    /// <summary>
    /// This method will generate and populate the Invoice `PossibleSurvivalDays` property.
    /// </summary>
    /// <param name="invoice"></param>
    /// <returns></returns>
    public async Task<ChatCompletions> GeneratePossibleSurvivalDays(Invoice invoice)
    {
        IList<string> invoiceItemsNamesAsList;
        if (invoice.Items.Select(item => item.GenericName).Any(name => string.IsNullOrEmpty(name)))
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.RawName).ToList();
        }
        else
        {
            invoiceItemsNamesAsList = invoice.Items.Select(item => item.GenericName).ToList();
        }

        var invoiceItemsNamesAsString = string.Join("\n", invoiceItemsNamesAsList);
        var invoicePossibleSurvivalDaysPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "If you are a normal human being, how many days do you think you can survive with this invoice? Output ONLY the generated number.";
        var chatMessages = new List<ChatMessage>()
        {
            new ChatMessage(ChatRole.System, @"You are a specialized AI assistant that has immense knowledge of the food industry. You are an expert at identifying products bought from stores. You will be tasked with different tasks from this domain area. You need to respect the user prompt and ONLY respond back with what the user requests. There is no need to offer more context or additional phrasing - as your responses need to be short and succint. Here are some examples of interactions with the user:"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                MONSTER ENERGY ULTRA
                PASTA FETTUCINI 500G
                SAN MARZANO TOMATOES 400G
                PARMIGIANO REGGIANO 250G

                If you are a normal human being, how many days do you think you can survive with this invoice? Output ONLY the generated number."),
            new ChatMessage(ChatRole.Assistant, @"3"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                PAPRIKA POWDER 100G
                MAYONNAISE 500ML
                WHITE POTATOES 1KG
                PARMIGIANO REGGIANO 250G
                SAN MARZANO TOMATOES 400G
                PASTA FETTUCINI 500G
                SPAGHETTI 
                BREAD WITH SEEDS

                If you are a normal human being, how many days do you think you can survive with this invoice? Output ONLY the generated number."),
            new ChatMessage(ChatRole.User, @"5"),
            new ChatMessage(ChatRole.User, @"This invoice consists of the following items: 
                TOILET PAPER 2-PAPER
                DRINKING GLASSES x2
                CLEANING CLOTH

                If you are a normal human being, how many days do you think you can survive with this invoice? Output ONLY the generated number."),
            new ChatMessage(ChatRole.User, @"0"),
            new ChatMessage(ChatRole.System, "Now it's your turn... Here is the user input:"),
            new ChatMessage(ChatRole.User, invoicePossibleSurvivalDaysPrompt)
        };

        var chatOptions = new ChatCompletionsOptions(chatMessages)
        {
            Temperature = (float)0.5,
            MaxTokens = 10000,
            FrequencyPenalty = 0,
            PresencePenalty = 0,
            ChoiceCount = 1,
        };

        var invoicePossibleSurvivalDaysCompletion =
            await openAIClient.GetChatCompletionsAsync(model, chatOptions);

        return invoicePossibleSurvivalDaysCompletion.Value;
    }

    /// <summary>
    /// This method will generate and populate the InvoiceItem `PossibleSurvivalDays` property.
    /// </summary>
    /// <param name="itemName"></param>
    /// <returns></returns>
    public async Task<ChatCompletions> GenerateItemGenericName(string itemName)
    {
        var itemGenericNamePrompt = $"This item is locally called as `{itemName}`." +
            "Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name.";

        var chatMessages = new List<ChatMessage>()
        {
            new ChatMessage(ChatRole.System, @"You are a specialized AI assistant that has immense knowledge of the food industry. You are an expert at identifying products bought from stores. You will be tasked with different tasks from this domain area. You need to respect the user prompt and ONLY respond back with what the user requests. There is no need to offer more context or additional phrasing - as your responses need to be short and succint. Here are some examples of interactions with the user:"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `MONSTER ENERGY ULTRA`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Energy Drink"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `SAN MARZANO TOMATOES`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Tomatoes"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `GELATO HASSELNÖT`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Ice Cream"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `AUBERGINE Kampanj`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Aubergine"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `PORCHETTA Kampanj`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Porchetta"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `SKÅNSK SENAP`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Mustard"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `RABATTER`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Unknown"),
                        new ChatMessage(ChatRole.User, @"This item is locally called as `Livrare`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"Unknown"),
            new ChatMessage(ChatRole.System, "Now it's your turn... Here is the user input:"),
            new ChatMessage(ChatRole.User, itemGenericNamePrompt)
        };

        var chatOptions = new ChatCompletionsOptions(chatMessages)
        {
            Temperature = (float)1,
            MaxTokens = 10000,
            FrequencyPenalty = 0,
            PresencePenalty = 0,
            ChoiceCount = 1,
        };

        var itemGenericNameCompletion =
            await openAIClient.GetChatCompletionsAsync(model, chatOptions);
        return itemGenericNameCompletion.Value;
    }

    /// <summary>
    /// This method will generate and populate the InvoiceItem `Category` property.
    /// </summary>
    /// <param name="itemName"></param>
    /// <returns></returns>
    public async Task<ChatCompletions> GenerateItemCategory(string itemName)
    {
        var itemCategoryPrompt = $"This item is locally called as `{itemName}`." +
            "From the given list of item categories, please try, as much as possible, to find an adequate category for this item. Output ONLY the generated category.";

        var chatMessages = new List<ChatMessage>()
        {
            new ChatMessage(ChatRole.System, @"You are a specialized AI assistant that has immense knowledge of the food industry. You are an expert at identifying products bought from stores. You will be tasked with different tasks from this domain area. You need to respect the user prompt and ONLY respond back with what the user requests. There is no need to offer more context or additional phrasing - as your responses need to be short and succint. Here are the ONLY words that you can respond with: 
                NOT_DEFINED,
                BAKED_GOODS,
                GROCERIES,
                DAIRY,
                MEAT,
                FISH,
                FRUITS,
                VEGETABLES,
                BEVERAGES,
                ALCOHOLIC_BEVERAGES,
                TOBACCO,
                CLEANING_SUPPLIES,
                PERSONAL_CARE,
                MEDICINE,
                OTHER"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `MONSTER ENERGY ULTRA`.
                From the given list of item categories, please try, as much as possible, to find an adequate category for this item. Output ONLY the generated category."),
            new ChatMessage(ChatRole.Assistant, @"BEVERAGES"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `SAN MARZANO TOMATOES`.
                From the given list of item categories, please try, as much as possible, to find an adequate category for this item. Output ONLY the generated category."),
            new ChatMessage(ChatRole.Assistant, @"GROCERIES"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `GELATO HASSELNÖT`.
                From the given list of item categories, please try, as much as possible, to find an adequate category for this item. Output ONLY the generated category."),
            new ChatMessage(ChatRole.Assistant, @"DAIRY"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `PANT 1KR BURK 1×1KR`.
                From the given list of item categories, please try, as much as possible, to find an adequate category for this item. Output ONLY the generated category."),
            new ChatMessage(ChatRole.Assistant, @"OTHER"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `AUBERGINE Kampanj`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"GROCERIES"),
            new ChatMessage(ChatRole.User, @"This item is locally called as `PORCHETTA Kampanj`.
                Please try, as much as possible, to find a generic name for this item. Output ONLY the generated name."),
            new ChatMessage(ChatRole.Assistant, @"MEAT"),
            new ChatMessage(ChatRole.System, "Now it's your turn... Here is the user input:"),
            new ChatMessage(ChatRole.User, itemCategoryPrompt)
        };

        var chatOptions = new ChatCompletionsOptions(chatMessages)
        {
            Temperature = (float)1,
            MaxTokens = 10000,
            FrequencyPenalty = 0,
            PresencePenalty = 0,
            ChoiceCount = 1,
        };

        var itemGenericNameCompletion =
            await openAIClient.GetChatCompletionsAsync(model, chatOptions);
        return itemGenericNameCompletion.Value;

    }
}
