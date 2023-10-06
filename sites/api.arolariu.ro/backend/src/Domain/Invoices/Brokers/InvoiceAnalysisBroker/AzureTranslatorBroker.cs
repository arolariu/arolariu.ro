using Azure;
using Azure.AI.Translation.Text;

using Microsoft.Extensions.Configuration;

using System;
using System.Linq;
using System.Threading.Tasks;

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
    /// <param name="configuration"></param>
    public AzureTranslatorBroker(IConfiguration configuration)
    {
        var azureTranslatorEndpoint = configuration["Azure:CognitiveServices:EndpointName"]
            ?? throw new ArgumentNullException(nameof(configuration));

        var azureTranslatorApiKey = configuration["Azure:CognitiveServices:EndpointKey"]
            ?? throw new ArgumentNullException(nameof(configuration));

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

        Console.WriteLine($"Detected languages of the input text:" +
            $" {translation?.DetectedLanguage?.Language} with score: {translation?.DetectedLanguage?.Score}.");

        var result = translation?.Translations[0]?.Text ?? string.Empty;
        return result;
    }
}
