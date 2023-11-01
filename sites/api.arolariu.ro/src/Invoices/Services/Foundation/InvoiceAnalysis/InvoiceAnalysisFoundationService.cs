using arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Products;
using arolariu.Backend.Domain.Invoices.DTOs;

using Microsoft.Extensions.Configuration;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public partial class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
{
    private readonly AzureOpenAiBroker azureOpenAiBroker;
    private readonly AzureTranslatorBroker azureTranslatorBroker;
    private readonly AzureFormRecognizerBroker azureFormRecognizerBroker;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public InvoiceAnalysisFoundationService(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        azureOpenAiBroker = new AzureOpenAiBroker(configuration);
        azureTranslatorBroker = new AzureTranslatorBroker(configuration);
        azureFormRecognizerBroker = new AzureFormRecognizerBroker(configuration);
    }

    /// <inheritdoc/>
    public async Task AnalyzeInvoiceAsync(Invoice invoice, AnalysisOptionsDto options) =>
    await TryCatchAsync(async () =>
    {
        ValidateInvoiceExists(invoice);
        ValidateAnalysisOptionsAreSet(options);

        switch (options)
        {
            case AnalysisOptionsDto.CompleteAnalysis:
                await PerformFullAnalysis().ConfigureAwait(false);
                break;
            case AnalysisOptionsDto.InvoiceOnly:
                await PerformInvoiceOnlyAnalysis().ConfigureAwait(false);
                break;
            case AnalysisOptionsDto.InvoiceItemsOnly:
                await PerformInvoiceItemsOnlyAnalysis().ConfigureAwait(false);
                break;
            case AnalysisOptionsDto.NoAnalysis:
            default:
                break;
        }

        async Task PerformFullAnalysis()
        {
            await AnalyzeInvoicePhoto(invoice).ConfigureAwait(false);
            var updatedInvoiceItems = new List<Product>();
            foreach (var invoiceItem in invoice.Items)
            {
                var updatedItem = await AnalyzeInvoiceItemGenericName(invoiceItem).ConfigureAwait(false);
                var updatedItemWithCategory = await AnalyzeInvoiceItemCategory(updatedItem).ConfigureAwait(false);
                updatedInvoiceItems.Add(updatedItemWithCategory);
            }

            invoice.Items = updatedInvoiceItems;

            await AnalyzePossibleAllergensFor(invoice)
                .ConfigureAwait(false);

            await AnalyzePossibleRecipesFor(invoice)
                .ConfigureAwait(false);

            await AnalyzeInvoiceDescription(invoice)
                .ConfigureAwait(false);

            await AnalyzeEstimatedSurvivalDays(invoice)
                .ConfigureAwait(false);
        }
        async Task PerformInvoiceOnlyAnalysis()
        {
            await AnalyzeInvoiceDescription(invoice).ConfigureAwait(false);
            await AnalyzeEstimatedSurvivalDays(invoice).ConfigureAwait(false);
        }
        async Task PerformInvoiceItemsOnlyAnalysis()
        {
            var updatedInvoiceItems = new List<Product>();
            foreach (var invoiceItem in invoice.Items)
            {
                var updatedItem = await AnalyzeInvoiceItemGenericName(invoiceItem).ConfigureAwait(false);
                var updatedItemWithCategory = await AnalyzeInvoiceItemCategory(updatedItem).ConfigureAwait(false);
                updatedInvoiceItems.Add(updatedItemWithCategory);
            }

            invoice.Items = updatedInvoiceItems;
            await AnalyzePossibleAllergensFor(invoice).ConfigureAwait(false);
            await AnalyzePossibleRecipesFor(invoice).ConfigureAwait(false);
        }
    }).ConfigureAwait(false);

    private async Task<Invoice> AnalyzeInvoiceDescription(Invoice invoice)
    {
        var description = await azureOpenAiBroker
            .GenerateInvoiceDescription(invoice)
            .ConfigureAwait(false);

        return description is not null
            ? invoice with { Description = description }
            : invoice;
    }

    private async Task<Product> AnalyzeInvoiceItemGenericName(Product invoiceItem)
    {
        ValidateProductExists(invoiceItem);

        var translatedName = await azureTranslatorBroker
            .Translate(invoiceItem.RawName)
            .ConfigureAwait(false);

        var genericName = await azureOpenAiBroker
            .GenerateItemGenericName(translatedName)
            .ConfigureAwait(false);

        var updatedInvoiceItem = genericName is null
            ? invoiceItem with { GenericName = translatedName }
            : invoiceItem with { GenericName = genericName };

        return updatedInvoiceItem;
    }

    private async Task<Invoice> AnalyzeInvoicePhoto(Invoice invoice)
    {
        var analyzedInvoiceResult = await azureFormRecognizerBroker
            .SendInvoiceToAnalysisAsync(invoice)
            .ConfigureAwait(false);

        var updatedInvoice = azureFormRecognizerBroker
            .PopulateInvoiceWithAnalysisResult(invoice, analyzedInvoiceResult);

        return updatedInvoice;
    }

    private async Task<Product> AnalyzePossibleAllergensFor(Product product)
    {
        var allergensList = await azureOpenAiBroker
            .GeneratePossibleAllergens(product)
            .ConfigureAwait(false);

        return allergensList is not null
            ? product with { DetectedAllergens = allergensList }
            : product;
    }

    private async Task<Invoice> AnalyzePossibleRecipesFor(Invoice invoice)
    {
        var recipesList = await azureOpenAiBroker
            .GeneratePossibleRecipes(invoice)
            .ConfigureAwait(false);

        return recipesList is not null
            ? invoice with { PossibleRecipes = recipesList }
            : invoice;
    }

    private async Task<Invoice> AnalyzeEstimatedSurvivalDays(Invoice invoice)
    {
        var survivalDays = await azureOpenAiBroker
            .GeneratePossibleSurvivalDays(invoice)
            .ConfigureAwait(false);

        return invoice with { EstimatedSurvivalDays = survivalDays };
    }

    private async Task<Product> AnalyzeInvoiceItemCategory(Product invoiceItem)
    {
        var productCategory = await azureOpenAiBroker
            .GenerateItemCategory(invoiceItem.GenericName)
            .ConfigureAwait(false);

        return invoiceItem with { Category = productCategory };
    }
}
