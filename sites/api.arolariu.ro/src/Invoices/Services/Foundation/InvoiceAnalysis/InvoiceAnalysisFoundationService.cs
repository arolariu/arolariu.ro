using arolariu.Backend.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.Entities.Invoices;
using arolariu.Backend.Domain.Invoices.Entities.Products;

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

            await AnalyzeInvoicePossibleAllergens(invoice)
                .ConfigureAwait(false);

            await AnalyzeInvoicePossibleRecipes(invoice)
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
            await AnalyzeInvoicePossibleAllergens(invoice).ConfigureAwait(false);
            await AnalyzeInvoicePossibleRecipes(invoice).ConfigureAwait(false);
        }
    }).ConfigureAwait(false);

    private async Task<Invoice> AnalyzeInvoiceDescription(Invoice invoice)
    {
        ValidateInvoiceExists(invoice);
        ValidateInvoiceHasProducts(invoice);

        var description = await azureOpenAiBroker
            .GenerateInvoiceDescription(invoice)
            .ConfigureAwait(false);

        var updatedInvoice = description is null
            ? invoice
            : invoice with { Description = description };

        return updatedInvoice;
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
        ValidateInvoiceExists(invoice);

        var analyzedInvoiceResult = await azureFormRecognizerBroker
            .SendInvoiceToAnalysisAsync(invoice)
            .ConfigureAwait(false);

        var updatedInvoice = azureFormRecognizerBroker
            .PopulateInvoiceWithAnalysisResult(invoice, analyzedInvoiceResult);

        return updatedInvoice;
    }

    private async Task<Invoice> AnalyzeInvoicePossibleAllergens(Invoice invoice)
    {
        ValidateInvoiceExists(invoice);

        var allergensList = await azureOpenAiBroker
            .GeneratePossibleAllergens(invoice)
            .ConfigureAwait(false);

        // TODO: fix this.
        return invoice;
    }

    private async Task<Invoice> AnalyzeInvoicePossibleRecipes(Invoice invoice)
    {
        ValidateInvoiceExists(invoice);

        var recipesList = await azureOpenAiBroker
            .GeneratePossibleRecipes(invoice)
            .ConfigureAwait(false);

        return recipesList is null
            ? invoice
            : invoice with { PossibleRecipes = recipesList };
    }

    private async Task<Invoice> AnalyzeEstimatedSurvivalDays(Invoice invoice)
    {
        ValidateInvoiceExists(invoice);

        var survivalDays = await azureOpenAiBroker
            .GeneratePossibleSurvivalDays(invoice)
            .ConfigureAwait(false);

        return invoice with { EstimatedSurvivalDays = survivalDays };
    }

    private async Task<Product> AnalyzeInvoiceItemCategory(Product invoiceItem)
    {
        ValidateProductExists(invoiceItem);
        ValidateProductNameExists(invoiceItem);

        var productCategory = await azureOpenAiBroker
            .GenerateItemCategory(invoiceItem.GenericName)
            .ConfigureAwait(false);

        return invoiceItem with { Category = productCategory };
    }
}
