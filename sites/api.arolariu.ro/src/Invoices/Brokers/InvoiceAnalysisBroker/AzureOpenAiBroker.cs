using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DDD.Contracts;
using Azure;
using Azure.AI.OpenAI;

using Microsoft.Extensions.Configuration;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

/// <summary>
/// The Azure OpenAI broker service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public partial class AzureOpenAiBroker : IAnalysisBroker
{
    private readonly string model = "gpt-turbo";
    private readonly OpenAIClient openAIClient;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public AzureOpenAiBroker(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        var openAiEndpoint = configuration["Azure:OpenAI:EndpointName"]
            ?? throw new ArgumentNullException(nameof(configuration));

        var openAiKey = configuration["Azure:OpenAI:EndpointKey"]
            ?? throw new ArgumentNullException(nameof(configuration));

        openAIClient = new OpenAIClient(
            new Uri(openAiEndpoint),
            new AzureKeyCredential(openAiKey));
    }

    /// <inheritdoc/>
    public async Task<string> GenerateInvoiceDescription(Invoice invoice)
    {
        var productsList = invoice?.Items.Select(item => item.GenericName).ToList();
        var invoiceItemsNamesAsString = string.Join("\n", productsList!);
        var invoiceDescriptionPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "Generate a simple, human-readable, 30 characters long description for this invoice. Output ONLY the generated description.";

        var context = CreateContextListForInvoiceDescription();
        context.Add(new ChatMessage(ChatRole.User, invoiceDescriptionPrompt));

        var chatOptions = new ChatCompletionsOptions(context);
        ConfigureChatOptions(chatOptions, 1.3f, 10_000, 0, 0, 1);

        var invoiceDescriptionCompletion = await openAIClient
            .GetChatCompletionsAsync(model, chatOptions)
            .ConfigureAwait(false);

        var description = invoiceDescriptionCompletion.Value.Choices[0].Message.Content;
        return description;
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Recipe>> GeneratePossibleRecipes(Invoice invoice)
    {
        var productsList = invoice?.Items.Select(item => item.GenericName).ToList();
        var invoiceItemsNamesAsString = string.Join("\n", productsList!);
        var invoicePossibleReceiptsPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "Generate a list of maximum 3 possible recipes for this invoice. Output ONLY the generated recipes.";

        var context = CreateContextListForRecipes();
        context.Add(new ChatMessage(ChatRole.User, invoicePossibleReceiptsPrompt));

        var chatOptions = new ChatCompletionsOptions(context);
        ConfigureChatOptions(chatOptions, 0.5f, 10_000, 0, 0, 1);

        var invoicePossibleReceiptsCompletion = await openAIClient
            .GetChatCompletionsAsync(model, chatOptions)
            .ConfigureAwait(false);

        var recipes = invoicePossibleReceiptsCompletion.Value.Choices[0].Message.Content.Split(',')
            .Select(recipe => new Recipe(recipe, TimeOnly.MinValue, 0, null!,null!))
            .ToList();

        return recipes;
    }

    /// <inheritdoc/>
    public async Task<int> GeneratePossibleSurvivalDays(Invoice invoice)
    {
        var productsList = invoice?.Items.Select(item => item.GenericName).ToList();
        var invoiceItemsNamesAsString = string.Join("\n", productsList!);
        var invoicePossibleSurvivalDaysPrompt = $"This invoice consists of the following items: {invoiceItemsNamesAsString}." +
            "If you are a normal human being, how many days do you think you can survive with this invoice? Output ONLY the generated number.";

        var context = CreateContextListForSurvivalFact();
        context.Add(new ChatMessage(ChatRole.User, invoicePossibleSurvivalDaysPrompt));

        var chatOptions = new ChatCompletionsOptions(context);
        ConfigureChatOptions(chatOptions, 0.5f, 10_000, 0, 0, 1);

        var invoicePossibleSurvivalDaysCompletion = await openAIClient
            .GetChatCompletionsAsync(model, chatOptions)
            .ConfigureAwait(false);

        var survivalDays = invoicePossibleSurvivalDaysCompletion.Value.Choices[0].Message.Content;
        return int.Parse(survivalDays, CultureInfo.InvariantCulture);
    }
}
