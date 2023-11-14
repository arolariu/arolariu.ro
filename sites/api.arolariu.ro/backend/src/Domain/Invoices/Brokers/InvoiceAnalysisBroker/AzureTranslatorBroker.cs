using arolariu.Backend.Core.Domain.General.Services.KeyVault;

using Azure;
using Azure.AI.Translation.Text;

using System;
using System.Linq;
using System.Threading.Tasks;
using System.Transactions;

namespace arolariu.Backend.Core.Domain.Invoices.Brokers.InvoiceAnalysisBroker;

/// <summary>
/// This class represents the Azure translator broker.
/// </summary>
public class AzureTranslatorBroker
{
    private readonly TextTranslationClient textTranslationClient;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="keyVaultService"></param>
    public AzureTranslatorBroker(IKeyVaultService keyVaultService)
    {
        var azureTranslatorEndpoint = keyVaultService.GetSecret("arolariu-cognitive-services-endpoint");
        var azureTranslatorApiKey = keyVaultService.GetSecret("arolariu-cognitive-services-connString");

        textTranslationClient = new TextTranslationClient(
            new AzureKeyCredential(azureTranslatorApiKey),
            new Uri(azureTranslatorEndpoint));
    }

    /// <summary>
    /// Translates the given text to the given language.
    /// </summary>
    /// <param name="text"></param>
    /// <param name="language"></param>
    /// <returns></returns>
    public async Task<string> Translate(string text, string language="en")
    {
        var response = await textTranslationClient.TranslateAsync(language, text);
        var translation = response.Value.FirstOrDefault();

        Console.WriteLine($"Detected languages of the input text: {translation?.DetectedLanguage?.Language} with score: {translation?.DetectedLanguage?.Score}.");

        var result = translation?.Translations.FirstOrDefault()?.Text ?? string.Empty;
        return result;
    }
}
