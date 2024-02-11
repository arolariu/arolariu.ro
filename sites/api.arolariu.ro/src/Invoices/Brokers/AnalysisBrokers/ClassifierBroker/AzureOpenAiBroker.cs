using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;
using System.Text.RegularExpressions;
using System.Globalization;

namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.ClassifierBroker;

/// <summary>
/// The Azure OpenAI broker service.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public partial class AzureOpenAiBroker(OpenAIService aiService) : IClassifierBroker
{
    /// <inheritdoc/>
    public async Task<string> GenerateInvoiceDescription(Invoice invoice)
    {
        var productsList = invoice?.Items.Select(item => item.GenericName).ToList();
        var thread = await aiService.CreateThread().ConfigureAwait(false);
        var threadIdentifier = thread.id;

        await aiService.AddMessageToThread(threadIdentifier, new OpenAiRequestMessage
        {
            role = OpenAiThreadMessageRole.User,
            content = "This invoice consists of the following items:"
        }).ConfigureAwait(false);

        foreach (var item in productsList!)
        {
            var message = new OpenAiRequestMessage
            {
                role = OpenAiThreadMessageRole.User,
                content = item
            };
            await aiService.AddMessageToThread(threadIdentifier, message)
                .ConfigureAwait(false);
        }

        await aiService.AddMessageToThread(threadIdentifier, new OpenAiRequestMessage
        {
            role = OpenAiThreadMessageRole.User,
            content = "Generate a short, funny, 30 character long description of the invoice, based on the given products list."
        }).ConfigureAwait(false);

        await aiService.ExecuteThreadRun(threadIdentifier).ConfigureAwait(false);
        return await aiService.GetAssistantResponse(threadIdentifier).ConfigureAwait(false);
    }

    /// <inheritdoc/>
    public Task<IEnumerable<Allergen>> GeneratePossibleAllergens(Product product)
    {
        throw new NotImplementedException();
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Recipe>> GeneratePossibleRecipes(IEnumerable<Product> products)
    {
        var productsList = products.Select(item => item.GenericName).ToList();
        var thread = await aiService.CreateThread().ConfigureAwait(false);
        var threadIdentifier = thread.id;

        await aiService.AddMessageToThread(threadIdentifier, new OpenAiRequestMessage
        {
            role = OpenAiThreadMessageRole.User,
            content = "This invoice consists of the following items:"
        }).ConfigureAwait(false);

        foreach (var item in productsList!)
        {
            var message = new OpenAiRequestMessage
            {
                role = OpenAiThreadMessageRole.User,
                content = item
            };
            await aiService.AddMessageToThread(threadIdentifier, message)
                .ConfigureAwait(false);
        }

        await aiService.AddMessageToThread(threadIdentifier, new OpenAiRequestMessage
        {
            role = OpenAiThreadMessageRole.User,
            content = "Generate a list of maximum 3 possible recipes for this invoice. Output ONLY the generated recipes."
        }).ConfigureAwait(false);

        await aiService.ExecuteThreadRun(threadIdentifier).ConfigureAwait(false);
        var response = await aiService.GetAssistantResponse(threadIdentifier).ConfigureAwait(false);
        var recipes = response.Split(',').Select(recipe => new Recipe(recipe)).ToList();
        return recipes;
    }

    /// <inheritdoc/>
    public async Task<int> GeneratePossibleSurvivalDays(IEnumerable<Product> products)
    {
        var productsList = products.Select(item => item.GenericName).ToList();
        var thread = await aiService.CreateThread().ConfigureAwait(false);
        var threadIdentifier = thread.id;

        await aiService.AddMessageToThread(threadIdentifier, new OpenAiRequestMessage
        {
            role = OpenAiThreadMessageRole.User,
            content = "This invoice consists of the following items:"
        }).ConfigureAwait(false);

        foreach (var item in productsList!)
        {
            var message = new OpenAiRequestMessage
            {
                role = OpenAiThreadMessageRole.User,
                content = item
            };
            await aiService.AddMessageToThread(threadIdentifier, message)
                .ConfigureAwait(false);
        }

        await aiService.AddMessageToThread(threadIdentifier, new OpenAiRequestMessage
        {
            role = OpenAiThreadMessageRole.User,
            content = "Output an estimate of how many days can a normal, healthy human being, survive with the given products, given normal circumstances."
        }).ConfigureAwait(false);

        await aiService.ExecuteThreadRun(threadIdentifier).ConfigureAwait(false);
        var response = await aiService.GetAssistantResponse(threadIdentifier).ConfigureAwait(false);

        // Create a regex that will retrieve the number from the response.
        Regex regex = new(@"\d+");
        var match = regex.Match(response);
        var survivalDays = int.Parse(match.Value, CultureInfo.InvariantCulture);
        return survivalDays;
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
