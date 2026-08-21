namespace arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;

using System;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

using Azure;
using Azure.AI.DocumentIntelligence;
using Azure.Core;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Uses Azure Document Intelligence to extract provider-neutral records from scan URIs.
/// </summary>
/// <remarks>
/// <para>
/// This broker is intentionally thin: it invokes the Azure SDK, maps the provider response into
/// <see cref="DocumentIntelligenceRecord"/>, and returns that immutable provider-neutral contract.
/// </para>
/// <para>
/// It does not accept or mutate domain aggregates and it leaves exception classification to the
/// surrounding foundation layer.
/// </para>
/// </remarks>
public sealed partial class AzureDocumentIntelligenceBroker : IDocumentIntelligenceBroker
{
  private const string ReceiptModelIdentifier = "prebuilt-receipt";
  private readonly DocumentIntelligenceClient client;

  /// <summary>
  /// Initializes the production broker from application configuration.
  /// </summary>
  /// <param name="optionsManager">The application-options provider containing endpoint credentials.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="optionsManager"/> is null.</exception>
  public AzureDocumentIntelligenceBroker(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);

    ApplicationOptions options = optionsManager.GetApplicationOptions();

    client = new DocumentIntelligenceClient(
      endpoint: new Uri(options.CognitiveServicesEndpoint),
      credential: new AzureKeyCredential(options.CognitiveServicesKey),
      options: new DocumentIntelligenceClientOptions
      {
        Retry =
        {
          MaxRetries = 2,
          Mode = RetryMode.Exponential,
          NetworkTimeout = TimeSpan.FromMinutes(5),
        },
      });
  }

  /// <summary>
  /// Initializes the broker with an existing SDK client for deterministic Broker-boundary tests.
  /// </summary>
  /// <param name="client">The Document Intelligence client to invoke.</param>
  internal AzureDocumentIntelligenceBroker(DocumentIntelligenceClient client) =>
    this.client = client ?? throw new ArgumentNullException(nameof(client));

  /// <inheritdoc/>
  public async ValueTask<DocumentIntelligenceRecord> AnalyzeReceiptAsync(
    Uri scanLocation,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(scanLocation);

    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeReceiptAsync));
    activity?.SetTag("receipt.scan.source_kind", "uri");

    Operation<AnalyzeResult> operation = await client
      .AnalyzeDocumentAsync(
        WaitUntil.Completed,
        ReceiptModelIdentifier,
        scanLocation,
        cancellationToken)
      .ConfigureAwait(false);

    AnalyzeResult result = operation.Value;

    if (result.Documents.Count == 0)
    {
      throw new InvalidStructuredOutputException(
        "Azure Document Intelligence returned no analyzed documents for the receipt scan.");
    }

    AnalyzedDocument analyzedDocument = result.Documents[0];

    return MapDocumentIntelligenceRecord(analyzedDocument);
  }
}
