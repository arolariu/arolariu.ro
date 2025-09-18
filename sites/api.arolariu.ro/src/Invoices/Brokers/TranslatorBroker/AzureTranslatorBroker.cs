namespace arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;

using Azure.AI.Translation.Text;
using Azure.Core.Pipeline;
using Azure.Identity;

/// <summary>
/// Azure AI Translation concrete broker that provides best‑effort text translation and language detection services
/// for upstream enrichment pipelines (naming, categorization, UI localization).
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> Implements <see cref="ITranslatorBroker"/> by delegating to <see cref="TextTranslationClient"/>.
/// Performs ONLY external service invocation + minimal projection. NO responsibility for: domain validation, caching, throttling,
/// retry / circuit breaker policy, authorization, logging, metrics, or batching.</para>
/// <para><b>Security:</b> Relies on <see cref="DefaultAzureCredential"/> (managed identity in non-DEBUG builds) instead of static keys.
/// Environment variable <c>AZURE_CLIENT_ID</c> must be configured in managed identity deployments.</para>
/// <para><b>Determinism:</b> Translation output may change over time as underlying models evolve; callers SHOULD NOT rely on exact
/// string stability for idempotent storage decisions (store original text + target locale if persistence required).</para>
/// <para><b>Throughput:</b> Each call is a network round trip. High-volume translation SHOULD be centralized in an orchestration layer
/// that batches, parallelizes, and introduces resilience policies (retry with jitter, adaptive rate limiting).</para>
/// <para><b>Backlog:</b> Cancellation token support, glossary / custom terminology injection, multi-target fan‑out translation,
/// profanity masking, HTML mode, telemetry decorators (latency, failure classification), and output quality scoring.</para>
/// </remarks>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public class AzureTranslatorBroker : ITranslatorBroker
{
  private readonly TextTranslationClient textTranslationClient;

  /// <summary>
  /// Initializes the broker with application configuration and builds a <see cref="TextTranslationClient"/> using default Azure credentials.
  /// </summary>
  /// <remarks>
  /// <para>Construction is side‑effect free (no network calls). The client is thread-safe; the broker instance is suitable for scoped
  /// or singleton lifetimes depending on broader DI design.</para>
  /// </remarks>
  /// <param name="optionsManager">Options source providing <c>CognitiveServicesEndpoint</c> (required). Key material unused when managed identity is active.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="optionsManager"/> is null.</exception>
  public AzureTranslatorBroker(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    ApplicationOptions options = optionsManager.GetApplicationOptions();

    var cognitiveServicesEndpoint = options.CognitiveServicesEndpoint;
    var cognitiveServicesApiKey = options.CognitiveServicesKey;
    var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
			}
#endif
    );

    textTranslationClient = new TextTranslationClient(
      credential: credentials,
      endpoint: new Uri(cognitiveServicesEndpoint));
  }

  /// <summary>
  /// Initializes the broker with a custom <see cref="HttpClient"/> transport (primarily for testing or advanced pipeline customization).
  /// </summary>
  /// <remarks>
  /// <para>Allows injection of a fake or instrumented HTTP pipeline (e.g. for deterministic integration tests, chaos experiments,
  /// or distributed tracing enrichment). All other semantics match the primary constructor.</para>
  /// </remarks>
  /// <param name="optionsManager">Options source (MUST NOT be null).</param>
  /// <param name="httpClient">Pre-configured HTTP client instance (MUST NOT be null). Caller owns its lifecycle.</param>
  /// <exception cref="ArgumentNullException">Thrown when any dependency is null.</exception>
  public AzureTranslatorBroker(IOptionsManager optionsManager, HttpClient httpClient)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    ArgumentNullException.ThrowIfNull(httpClient);
    ApplicationOptions options = optionsManager.GetApplicationOptions();

    var cognitiveServicesEndpoint = options.CognitiveServicesEndpoint;
    var cognitiveServicesApiKey = options.CognitiveServicesKey;
    var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
			}
#endif
    );

    textTranslationClient = new TextTranslationClient(
      credential: credentials,
      endpoint: new Uri(cognitiveServicesEndpoint),
      options: new TextTranslationClientOptions
      {
        Transport = new HttpClientTransport(httpClient)
      }
    );
  }

  /// <summary>
  /// Translates source text into a target locale (default: English).
  /// </summary>
  /// <remarks>
  /// <para><b>API Call:</b> Single request to Azure Translation service. No batching or caching performed.</para>
  /// <para><b>Fallback:</b> Returns empty string when translation array is unexpectedly empty (graceful degradation pattern).</para>
  /// <para><b>Validation:</b> Caller SHOULD ensure <paramref name="text"/> is non-empty; this method does not trim or sanitize.</para>
  /// </remarks>
  /// <param name="text">Source text to translate.</param>
  /// <param name="language">Target BCP‑47 language code (e.g. "en", "ro", "de").</param>
  /// <returns>Translated text or empty string if none returned.</returns>
  public async Task<string> Translate(string text, string language = "en")
  {
    var response = await textTranslationClient
      .TranslateAsync(language, text)
      .ConfigureAwait(false);

    var translation = response.Value[0];
    var result = translation?.Translations[0]?.Text ?? string.Empty;
    return result;
  }

  /// <summary>
  /// Infers the most probable language of the supplied text.
  /// </summary>
  /// <remarks>
  /// <para><b>Mechanism:</b> Performs a translation call (target English) and inspects the detected language metadata returned with the translation batch.</para>
  /// <para><b>Limitations:</b> Very short or mixed-language inputs may yield low-confidence or generic results; confidence score is not currently exposed.</para>
  /// </remarks>
  /// <param name="text">Text whose language should be identified.</param>
  /// <returns>Detected BCP‑47 language code (e.g. "en", "ro").</returns>
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
