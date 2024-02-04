using arolariu.Backend.Common.Options;

using Azure;
using Azure.AI.Translation.Text;

using Microsoft.Extensions.Options;

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
    /// <param name="options"></param>
    public AzureTranslatorBroker(IOptionsMonitor<AzureOptions> options)
    {
        ArgumentNullException.ThrowIfNull(options);
        textTranslationClient = new TextTranslationClient(
            new AzureKeyCredential(options.CurrentValue.CognitiveServicesKey),
            new Uri(options.CurrentValue.CognitiveServicesEndpoint));
    }

    /// <inheritdoc/>
    public async Task<string> Translate(string text, string language = "en")
    {
        var response = await textTranslationClient
            .TranslateAsync(language, text)
            .ConfigureAwait(false);

        var translation = response.Value[0];
        var result = translation?.Translations[0]?.Text ?? string.Empty;
        return result;
    }

    /// <inheritdoc/>
    public async Task<string> DetectLanguage(string text)
    {
        var translatedText = await textTranslationClient
            .TranslateAsync(text, "en")
            .ConfigureAwait(false);

        var translation = translatedText.Value[0];
        var detectedLanguage = translation.DetectedLanguage.Language;
        return detectedLanguage;
    }
}
