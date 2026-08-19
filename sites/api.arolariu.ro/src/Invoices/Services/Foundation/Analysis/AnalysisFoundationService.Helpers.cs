namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Modules;

public sealed partial class AnalysisFoundationService
{
  private async Task<GenerativeResponse<TResult>> GenerateWithRetryAsync<TResult>(
    GenerativeTelemetryMetadata telemetry,
    GenerativeRequest request,
    CancellationToken cancellationToken)
    where TResult : class =>
    await retryPolicy.ExecuteAsync(
      async retryCancellationToken =>
      {
        using var activity = global::arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators
          .InvoicePackageTracing
          .StartActivity(nameof(GenerateWithRetryAsync));
        activity?.SetTag("analysis.capability", telemetry.Capability.ToString());
        activity?.SetTag("analysis.schema_version", telemetry.SchemaVersion);
        activity?.SetTag("analysis.prompt_version", telemetry.PromptVersion);
        activity?.SetTag("analysis.taxonomy_version", telemetry.TaxonomyVersion);

        return await generativeAiBroker
          .GenerateStructuredAsync<TResult>(request, retryCancellationToken)
          .ConfigureAwait(false);
      },
      cancellationToken,
      attempt =>
      {
        InvoiceMetrics.RecordCapabilityRetry(telemetry.Capability, attempt);
        logger.LogAnalysisCapabilityRetryAttempted(telemetry.Capability, attempt);
      }).ConfigureAwait(false);

  private static Dictionary<string, TEntry> IndexByCorrelationToken<TEntry>(
    IReadOnlyList<TEntry> entries,
    HashSet<string> expectedTokens,
    Func<TEntry, string> correlationTokenSelector)
  {
    var indexed = new Dictionary<string, TEntry>(StringComparer.Ordinal);

    foreach (TEntry entry in entries)
    {
      string token = RequireStructuredText(correlationTokenSelector(entry), "correlationToken");

      if (!expectedTokens.Contains(token))
      {
        throw new InvalidStructuredOutputException(
          $"Structured output referenced unknown correlation token '{token}'.");
      }

      if (!indexed.TryAdd(token, entry))
      {
        throw new InvalidStructuredOutputException(
          $"Structured output contained a duplicate correlation token '{token}'.");
      }
    }

    if (indexed.Count != expectedTokens.Count)
    {
      throw new InvalidStructuredOutputException(
        "Structured output is missing a correlation token entry for one or more requested subjects.");
    }

    return indexed;
  }
}
