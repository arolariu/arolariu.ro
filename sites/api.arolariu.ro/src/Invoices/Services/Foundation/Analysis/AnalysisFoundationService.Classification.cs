namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using DDD = arolariu.Backend.Domain.Invoices.DDD;

public sealed partial class AnalysisFoundationService
{
  /// <summary>Returns the version declared by a loaded trusted taxonomy artifact.</summary>
  /// <param name="system">The taxonomy system whose version is requested.</param>
  /// <param name="cancellationToken">The token checked before taxonomy access.</param>
  /// <returns>The loaded artifact's declared version.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationValidationException">
  /// Thrown when <paramref name="system"/> is unsupported.
  /// </exception>
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

  /// <summary>Searches a trusted taxonomy artifact for a bounded candidate set.</summary>
  /// <param name="system">The taxonomy system to search.</param>
  /// <param name="query">The taxonomy search expression.</param>
  /// <param name="maximumResults">The maximum candidate count requested from the broker.</param>
  /// <param name="cancellationToken">The token checked before taxonomy access.</param>
  /// <returns>Canonical candidate codes and official labels.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationValidationException">
  /// Thrown when a search argument is invalid.
  /// </exception>
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

  /// <summary>Resolves a code-only request into a canonical taxonomy snapshot.</summary>
  /// <param name="system">The taxonomy system containing the requested code.</param>
  /// <param name="code">The exact taxonomy code to resolve.</param>
  /// <param name="origin">The origin assigned to the resolved classification.</param>
  /// <param name="confidence">The optional analysis confidence.</param>
  /// <param name="evidence">The evidence retained on the resolved snapshot.</param>
  /// <param name="cancellationToken">The token checked before taxonomy access.</param>
  /// <returns>The canonical classification from the trusted artifact.</returns>
  /// <exception cref="DDD.Analysis.Exceptions.Outer.Foundation.AnalysisFoundationDependencyValidationException">
  /// Thrown when the taxonomy broker cannot resolve the requested code.
  /// </exception>
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
