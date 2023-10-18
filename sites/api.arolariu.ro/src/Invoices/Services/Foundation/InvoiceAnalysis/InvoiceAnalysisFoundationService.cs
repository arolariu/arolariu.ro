using arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;
using arolariu.Backend.Core.Domain.Invoices.DTOs;
using arolariu.Backend.Core.Domain.Invoices.Entities.Invoices;
using arolariu.Backend.Core.Domain.Invoices.Entities.Products;

namespace arolariu.Backend.Core.Domain.Invoices.Services.Foundation.InvoiceAnalysis;

/// <summary>
/// The invoice analysis foundation service interface represents the foundation analysis service for the invoice domain.
/// </summary>
public class InvoiceAnalysisFoundationService : IInvoiceAnalysisFoundationService
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
        azureOpenAiBroker = new AzureOpenAiBroker(configuration);
        azureTranslatorBroker = new AzureTranslatorBroker(configuration);
        azureFormRecognizerBroker = new AzureFormRecognizerBroker(configuration);
    }

    /// <inheritdoc/>
    public async Task<Invoice> AnalyzeInvoiceWithOptions(Invoice invoice, InvoiceAnalysisOptionsDto options)
    {
        if (options.CompleteAnalysis)
        {
            invoice = await AnalyzeInvoicePhoto(invoice);
            var updatedInvoiceItems = new List<Product>();
            foreach (var invoiceItem in invoice.Items)
            {
                var updatedItem = await AnalyzeInvoiceItemGenericName(invoiceItem);
                var updatedItemWithCategory = await AnalyzeInvoiceItemCategory(updatedItem);
                updatedInvoiceItems.Add(updatedItemWithCategory);
            }

            invoice.Items = updatedInvoiceItems;
            invoice = await AnalyzeInvoicePossibleAllergens(invoice);
            invoice = await AnalyzeInvoicePossibleRecipes(invoice);
            invoice = await AnalyzeInvoiceDescription(invoice);
            invoice = await AnalyzeEstimatedSurvivalDays(invoice);
            return invoice;
        }

        if (options.InvoiceOnly)
        {
            invoice = await AnalyzeInvoiceDescription(invoice);
            invoice = await AnalyzeEstimatedSurvivalDays(invoice);
            return invoice;
        }

        if (options.InvoiceItemsOnly)
        {
            var updatedInvoiceItems = new List<Product>();
            foreach (var invoiceItem in invoice.Items)
            {
                var updatedItem = await AnalyzeInvoiceItemGenericName(invoiceItem);
                var updatedItemWithCategory = await AnalyzeInvoiceItemCategory(updatedItem);
                updatedInvoiceItems.Add(updatedItemWithCategory);
            }

            invoice.Items = updatedInvoiceItems;
            invoice = await AnalyzeInvoicePossibleAllergens(invoice);
            invoice = await AnalyzeInvoicePossibleRecipes(invoice);
            return invoice;
        }

        return invoice;
    }

    private async Task<Invoice> AnalyzeInvoiceDescription(Invoice invoice)
    {
        var analyzedInvoiceResult = await azureOpenAiBroker.GenerateInvoiceDescription(invoice);
        var updatedInvoice = analyzedInvoiceResult is null
            ? invoice
            : invoice with { Description = analyzedInvoiceResult.Choices[0].Message.Content };
        return updatedInvoice;
    }

    private async Task<Product> AnalyzeInvoiceItemGenericName(Product invoiceItem)
    {
        var translatedInvoiceItemName = await azureTranslatorBroker.Translate(invoiceItem.RawName);
        var analyzedInvoiceItemResult = await azureOpenAiBroker.GenerateItemGenericName(translatedInvoiceItemName);
        var updatedInvoiceItem = analyzedInvoiceItemResult is null
            ? invoiceItem with { GenericName = translatedInvoiceItemName }
            : invoiceItem with { GenericName = analyzedInvoiceItemResult.Choices[0].Message.Content };
        return updatedInvoiceItem;
    }

    private async Task<Invoice> AnalyzeInvoicePhoto(Invoice invoice)
    {
        var analyzedInvoiceResult = await azureFormRecognizerBroker.SendInvoiceToAnalysisAsync(invoice);
        var updatedInvoice = await azureFormRecognizerBroker.PopulateInvoiceWithAnalysisResultAsync(invoice, analyzedInvoiceResult);
        return updatedInvoice;
    }

    private async Task<Invoice> AnalyzeInvoicePossibleAllergens(Invoice invoice)
    {
        var analyzedInvoiceResult = await azureOpenAiBroker.GeneratePossibleAllergens(invoice);
        if (analyzedInvoiceResult is null)
        {
            return invoice;
        }
        else
        {
            var invoiceAllergensAsString = analyzedInvoiceResult.Choices[0].Message.Content;
            try
            {
                var invoiceAllergensAsList = invoiceAllergensAsString.Split(',').ToList();
                return invoice; // TODO: fix this
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return invoice;
            }
        }
    }

    private async Task<Invoice> AnalyzeInvoicePossibleRecipes(Invoice invoice)
    {
        var analyzedInvoiceResult = await azureOpenAiBroker.GeneratePossibleRecipes(invoice);
        if (analyzedInvoiceResult is null)
        {
            return invoice;
        }
        else
        {
            var invoiceRecipesAsString = analyzedInvoiceResult.Choices[0].Message.Content;
            try
            {
                var invoiceRecipesAsList = invoiceRecipesAsString.Split(',').ToList();
                return invoice with { PossibleRecipes = invoiceRecipesAsList };
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return invoice;
            }
        }
    }

    private async Task<Invoice> AnalyzeEstimatedSurvivalDays(Invoice invoice)
    {
        var analyzedInvoiceResult = await azureOpenAiBroker.GeneratePossibleSurvivalDays(invoice);
        if (analyzedInvoiceResult is null)
        {
            return invoice;
        }
        else
        {
            if (int.TryParse(analyzedInvoiceResult.Choices[0].Message.Content, out int estimatedSurvivalDays))
            {
                return invoice with { EstimatedSurvivalDays = estimatedSurvivalDays };
            }
            else
            {
                return invoice;
            }
        }
    }

    private async Task<Product> AnalyzeInvoiceItemCategory(Product invoiceItem)
    {
        var analyzedInvoiceItemResult = await azureOpenAiBroker.GenerateItemCategory(invoiceItem.GenericName);
        if (analyzedInvoiceItemResult is null)
        {
            return invoiceItem;
        }
        else
        {
            if (Enum.TryParse(analyzedInvoiceItemResult.Choices[0].Message.Content, out ProductCategory itemCategory))
            {
                return invoiceItem with { Category = itemCategory };
            }
            else
            {
                return invoiceItem;
            }
        }
    }

}
