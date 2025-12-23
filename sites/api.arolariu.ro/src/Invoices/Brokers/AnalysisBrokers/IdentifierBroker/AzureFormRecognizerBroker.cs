namespace arolariu.Backend.Domain.Invoices.Brokers.AnalysisBrokers.IdentifierBroker;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Common.Options;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DTOs;

using Azure;
using Azure.AI.FormRecognizer.DocumentAnalysis;
using Azure.Identity;

/// <summary>
/// Azure Form Recognizer (Document Intelligence) concrete broker that performs best‑effort OCR + structural extraction over invoice scans
/// and projects recognized signals (merchant, products, payment) into a domain aggregate.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> Implements <see cref="IFormRecognizerBroker"/> by delegating to <see cref="DocumentAnalysisClient"/>
/// (prebuilt receipt model: <c>prebuilt-receipt</c>). It performs ONLY external service invocation + minimal mapping. No:
/// domain validation, retry policy, logging, metrics, authorization, enrichment chaining, or persistence.</para>
/// <para><b>Lifecycle:</b> Stateless wrapper around a single <see cref="DocumentAnalysisClient"/> instance (thread-safe). Scoped lifetime
/// registration is acceptable; underlying client could be promoted to singleton if connection reuse optimization is required.</para>
/// <para><b>Resilience:</b> Lets Azure SDK exceptions bubble (network / 429 / service faults) for higher-layer classification (retry / circuit breaker).
/// Partial extraction failures (missing fields, unexpected field types) are tolerated silently—unrecognized values remain at sentinel defaults.</para>
/// <para><b>Security:</b> Uses <see cref="DefaultAzureCredential"/> (managed identity in non-DEBUG) instead of API key string usage to reduce
/// secret management risk. Environment variable <c>AZURE_CLIENT_ID</c> must be present in managed identity deployments.</para>
/// <para><b>Output Model Fidelity:</b> Mapping intentionally narrow: only fields required for initial enrichment pipeline are projected.
/// Backlog: field provenance (confidence, bounding boxes) exposure for advanced UI / validation workflows.</para>
/// <para><b>Performance:</b> Dominated by service round‑trip latency and image size. Caller SHOULD parallelize at orchestration layer for bulk imports
/// and consider idempotent hashing to skip duplicate scans.</para>
/// <para><b>Backlog:</b> Cancellation token support, adaptive model routing (custom vs prebuilt), multi-page invoices, locale normalization,
/// normalization of currency codes, confidence threshold filtering, telemetry decorators.</para>
/// </remarks>
[ExcludeFromCodeCoverage] // brokers are not tested - they are wrappers over external services.
public sealed partial class AzureFormRecognizerBroker : IFormRecognizerBroker
{
  private readonly DocumentAnalysisClient client;

  /// <summary>
  /// Initializes the broker with configured Azure Cognitive Services (Document Intelligence) endpoint credentials.
  /// </summary>
  /// <remarks>
  /// <para>Builds a single <see cref="DocumentAnalysisClient"/> using <see cref="DefaultAzureCredential"/>. In non-DEBUG builds a managed identity
  /// client id is injected (federated workload identity). Throws fast on null dependency to fail early in composition root.</para>
  /// <para>No network calls are made during construction; the client performs lazy connection initialization on first request.</para>
  /// </remarks>
  /// <param name="optionsManager">Abstraction providing strongly typed application options (endpoint + key context; key unused when MI is present).</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="optionsManager"/> is null.</exception>
  public AzureFormRecognizerBroker(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    ApplicationOptions options = optionsManager.GetApplicationOptions();

    var documentIntelligenceEndpoint = options.CognitiveServicesEndpoint;
    var documentIntelligenceKey = options.CognitiveServicesKey;
    var credentials = new DefaultAzureCredential(
#if !DEBUG
			new DefaultAzureCredentialOptions
			{
				ManagedIdentityClientId = Environment.GetEnvironmentVariable("AZURE_CLIENT_ID")
			}
#endif
    );

    client = new DocumentAnalysisClient(
      endpoint: new Uri(documentIntelligenceEndpoint),
      credential: credentials);
  }


  /// <summary>
  /// Executes OCR + structured field extraction against the invoice's scan URI and merges recognized data into the provided aggregate.
  /// </summary>
  /// <remarks>
  /// <para><b>Model:</b> Invokes <c>AnalyzeDocumentFromUriAsync("prebuilt-receipt")</c>. Assumes <see cref="Invoice.Scans"/> contains a resolvable, accessible URI.</para>
  /// <para><b>Mutation:</b> Populates (or overwrites) <c>MerchantReference</c>, <c>Items</c>, and <c>PaymentInformation</c> via internal transformation helpers.
  /// Existing collection contents are appended (current implementation performs additive population; upstream deduplication MAY be required).</para>
  /// <para><b>Failure Handling:</b> Throws on null invoice argument and propagates Azure SDK exceptions (network/service) without translation.
  /// Partial field absence results in sentinel defaults without exception.</para>
  /// <para><b>Options:</b> Current implementation does not conditionally short‑circuit based on <paramref name="options"/> (backlog: selectively disable OCR stage).</para>
  /// </remarks>
  /// <param name="invoice">Target invoice aggregate (MUST NOT be null; MUST contain a <c>Scans.Location</c> URI).</param>
  /// <param name="options">Analysis directives (currently advisory placeholder).</param>
  /// <returns>Same <paramref name="invoice"/> instance enriched with recognized data.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="invoice"/> is null.</exception>
  public async ValueTask<Invoice> PerformOcrAnalysisOnSingleInvoice(Invoice invoice, AnalysisOptions options)
  {
    ArgumentNullException.ThrowIfNull(invoice);

    var firstScan = invoice.Scans.First();

    var operation = await client.AnalyzeDocumentFromUriAsync(
      WaitUntil.Completed,
      "prebuilt-receipt",
      firstScan.Location)
      .ConfigureAwait(false);

    var result = operation.Value;
    var receipt = result.Documents[0];

    return TransformOcrDataToInvoiceData(receipt, invoice);
  }

  /// <inheritdoc/>
  public async ValueTask<Merchant> PerformOcrAnalysisOnSingleMerchant(InvoiceScan scan, Merchant merchant, AnalysisOptions options)
  {
    ArgumentNullException.ThrowIfNull(merchant);

    var operation = await client.AnalyzeDocumentFromUriAsync(
     WaitUntil.Completed,
     "prebuilt-receipt",
     scan.Location)
     .ConfigureAwait(false);

    var result = operation.Value;
    var receipt = result.Documents[0];

    return TransformOcrDataToMerchantData(receipt, merchant);
  }

  private static Invoice TransformOcrDataToInvoiceData(AnalyzedDocument ocrData, Invoice invoice)
  {
    var products = IdentifyProducts(ocrData);
    var payment = IdentifyPaymentInformation(ocrData);

    #region Populate the items array:
    foreach (var product in products)
    {
      invoice.Items.Add(product);
    }
    #endregion

    invoice.PaymentInformation = payment;

    return invoice;
  }

  private static Merchant TransformOcrDataToMerchantData(AnalyzedDocument ocrData, Merchant merchant)
  {
    var identifiedMerchant = IdentifyMerchant(ocrData);

    // Overwrite the merchant fields with the identified data:
    merchant.Name = identifiedMerchant.Name;
    merchant.Address = identifiedMerchant.Address;
    return merchant;
  }
}
