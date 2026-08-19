namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Builds <see cref="GenerativeAnalysisFoundationService"/> instances wired to deterministic test doubles.
/// </summary>
internal sealed class GenerativeClassificationHarness
{
  private GenerativeClassificationHarness(
    ScriptedGenerativeAnalysisBroker broker,
    ITaxonomyBroker taxonomyBroker,
    GenerativeAnalysisRetryPolicy? retryPolicy)
  {
    Broker = broker;
    TaxonomyBroker = taxonomyBroker;
    Service = retryPolicy is null
      ? new GenerativeAnalysisFoundationService(broker, taxonomyBroker, NullLoggerFactory.Instance)
      : new GenerativeAnalysisFoundationService(broker, taxonomyBroker, NullLoggerFactory.Instance, retryPolicy);
  }

  /// <summary>Gets the foundation service under test.</summary>
  public GenerativeAnalysisFoundationService Service { get; }

  /// <summary>Gets the scripted generative AI broker double backing <see cref="Service"/>.</summary>
  public ScriptedGenerativeAnalysisBroker Broker { get; }

  /// <summary>Gets the deterministic taxonomy broker backing <see cref="Service"/>.</summary>
  public ITaxonomyBroker TaxonomyBroker { get; }

  /// <summary>
  /// Creates a harness scripted for a single-product GPC classification happy path.
  /// </summary>
  /// <param name="searchTerms">The scripted English search terms produced by phase 1.</param>
  /// <param name="selectedCode">The scripted candidate code selected by phase 3.</param>
  /// <param name="correlationToken">The correlation token used for the single product.</param>
  /// <param name="confidence">The scripted selection confidence.</param>
  /// <returns>A harness ready to classify a single product.</returns>
  public static GenerativeClassificationHarness ForProduct(
    IReadOnlyList<string> searchTerms,
    string selectedCode,
    string correlationToken = "item-0001",
    double confidence = 0.9)
  {
    var searchTermsResult = new GenerativeAnalysisFoundationService.SearchTermsBatchResult(
      [new GenerativeAnalysisFoundationService.SearchTermsEntry(correlationToken, searchTerms)]);

    var selectionResult = new GenerativeAnalysisFoundationService.SelectionBatchResult(
      [new GenerativeAnalysisFoundationService.SelectionEntry(correlationToken, selectedCode, confidence)]);

    var broker = new ScriptedGenerativeAnalysisBroker(
      ScriptedGenerativeAnalysisBroker.Success(searchTermsResult),
      ScriptedGenerativeAnalysisBroker.Success(selectionResult));

    return new GenerativeClassificationHarness(broker, TaxonomyBrokerTestFactory.Create(), retryPolicy: null);
  }

  /// <summary>
  /// Creates a harness with a fully custom scripted broker and an optional injected retry policy.
  /// </summary>
  /// <param name="broker">The scripted generative AI broker double.</param>
  /// <param name="taxonomyBroker">The taxonomy broker to use, or null for the default deterministic broker.</param>
  /// <param name="retryPolicy">The retry policy to inject, or null for the default production retry policy.</param>
  /// <returns>A harness wired to the supplied doubles.</returns>
  public static GenerativeClassificationHarness Create(
    ScriptedGenerativeAnalysisBroker broker,
    ITaxonomyBroker? taxonomyBroker = null,
    GenerativeAnalysisRetryPolicy? retryPolicy = null) =>
    new(broker, taxonomyBroker ?? TaxonomyBrokerTestFactory.Create(), retryPolicy);
}
