namespace arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Azure;
using Azure.AI.Translation.Text;
using Azure.Core.Pipeline;

using Microsoft.Extensions.Options;

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

		var cognitiveServicesEndpoint = options.CurrentValue.CognitiveServicesEndpoint;
		var cognitiveServicesApiKey = options.CurrentValue.CognitiveServicesKey;

		textTranslationClient = new TextTranslationClient(
			credential: new AzureKeyCredential(cognitiveServicesApiKey),
			endpoint: new Uri(cognitiveServicesEndpoint));
	}

	/// <summary>
	/// Another constructor that allows passing a custom HttpClient.
	/// This is useful for testing purposes.
	/// </summary>
	/// <param name="options"></param>
	/// <param name="httpClient"></param>
	public AzureTranslatorBroker(IOptionsMonitor<AzureOptions> options, HttpClient httpClient)
	{
		ArgumentNullException.ThrowIfNull(options);
		ArgumentNullException.ThrowIfNull(httpClient);

		var cognitiveServicesEndpoint = options.CurrentValue.CognitiveServicesEndpoint;
		var cognitiveServicesApiKey = options.CurrentValue.CognitiveServicesKey;

		textTranslationClient = new TextTranslationClient(
			credential: new AzureKeyCredential(cognitiveServicesApiKey),
			endpoint: new Uri(cognitiveServicesEndpoint),
			options: new TextTranslationClientOptions
			{
				Transport = new HttpClientTransport(httpClient)
			}
		);
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
