namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisFoundationService
{
  /// <inheritdoc/>
  public async Task<string> GetTaxonomyVersionAsync(
    ClassificationSystem system,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(GetTaxonomyVersionAsync));
        return Task.FromResult(taxonomyBroker.GetArtifactVersion(system));
      },
      cancellationToken).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IReadOnlyList<ClassificationCandidateOption>> SearchTaxonomyAsync(
    ClassificationSystem system,
    string query,
    int maximumResults,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(SearchTaxonomyAsync));
        return Task.FromResult<IReadOnlyList<ClassificationCandidateOption>>(
          [.. taxonomyBroker
            .Search(system, query, maximumResults)
            .Select(result => new ClassificationCandidateOption(result.Code, result.OfficialLabel))]);
      },
      cancellationToken).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<StandardClassification> ResolveClassificationAsync(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(
      () =>
      {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ResolveClassificationAsync));
        return Task.FromResult(taxonomyBroker.Resolve(system, code, origin, confidence, evidence));
      },
      cancellationToken).ConfigureAwait(false);
}
