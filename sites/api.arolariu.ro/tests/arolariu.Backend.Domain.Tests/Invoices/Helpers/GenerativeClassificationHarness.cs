namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Builds <see cref="GenerativeAnalysisFoundationService"/> instances wired to deterministic test doubles.
/// </summary>
internal sealed class GenerativeClassificationHarness
{
  private GenerativeClassificationHarness(
    ScriptedGenerativeAnalysisBroker broker,
    GenerativeAnalysisRetryPolicy? retryPolicy)
  {
    Broker = broker;
    Service = retryPolicy is null
      ? new GenerativeAnalysisFoundationService(broker, NullLoggerFactory.Instance)
      : new GenerativeAnalysisFoundationService(broker, NullLoggerFactory.Instance, retryPolicy);
  }

  /// <summary>Gets the foundation service under test.</summary>
  public GenerativeAnalysisFoundationService Service { get; }

  /// <summary>Gets the scripted generative AI broker double backing <see cref="Service"/>.</summary>
  public ScriptedGenerativeAnalysisBroker Broker { get; }

  /// <summary>
  /// Creates a harness with a fully custom scripted broker and an optional injected retry policy.
  /// </summary>
  /// <param name="broker">The scripted generative AI broker double.</param>
  /// <param name="retryPolicy">The retry policy to inject, or null for the default production retry policy.</param>
  /// <returns>A harness wired to the supplied doubles.</returns>
  public static GenerativeClassificationHarness Create(
    ScriptedGenerativeAnalysisBroker broker,
    GenerativeAnalysisRetryPolicy? retryPolicy = null) =>
    new(broker, retryPolicy);
}
