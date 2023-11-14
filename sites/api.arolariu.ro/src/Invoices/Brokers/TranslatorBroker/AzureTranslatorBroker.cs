using Azure;
using Azure.AI.Translation.Text;

using Microsoft.Extensions.Configuration;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Threading.Tasks;

namespace arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

/// <summary>
/// This class represents the Azure translator broker.
/// </summary>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public class AzureTranslatorBroker : ITranslatorBroker
{
    private readonly TextTranslationClient textTranslationClient;

    /// <summary>
    /// Constructor.
    /// </summary>
    /// <param name="configuration"></param>
    public AzureTranslatorBroker(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        var azureTranslatorEndpoint = configuration["Azure:CognitiveServices:EndpointName"]
            ?? throw new ArgumentNullException(nameof(configuration));

        var azureTranslatorApiKey = configuration["Azure:CognitiveServices:EndpointKey"]
            ?? throw new ArgumentNullException(nameof(configuration));

        textTranslationClient = new TextTranslationClient(
            new AzureKeyCredential(azureTranslatorApiKey),
            new Uri(azureTranslatorEndpoint));
    }

    /// <inheritdoc/>
    public async Task<string> Translate(string text, string language = "en")
    {
        var response = await textTranslationClient
            .TranslateAsync(language, text)
            .ConfigureAwait(false);

        var translation = response.Value[0];

        Console.WriteLine($"Detected languages of the input text:" +
            $" {translation?.DetectedLanguage?.Language} with score: {translation?.DetectedLanguage?.Score}.");

        var result = translation?.Translations[0]?.Text ?? string.Empty;
        return result;
    }
}
