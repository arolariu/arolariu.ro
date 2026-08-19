namespace arolariu.Backend.Domain.Invoices.Services.Foundation.ClassificationAnalysis;

using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Defines the broker-neighbouring taxonomy lookup and canonical resolution boundary.
/// </summary>
/// <remarks>
/// This foundation service is the only invoice-domain foundation that talks directly to the taxonomy broker.
/// It owns taxonomy artifact version lookup, bounded search, and canonical code resolution, but never persists
/// aggregates or coordinates multi-capability workflows.
/// </remarks>
public interface IClassificationAnalysisFoundationService
{
  /// <summary>
  /// Retrieves the version of the loaded taxonomy artifact for a classification system.
  /// </summary>
  Task<string> GetArtifactVersionAsync(
    ClassificationSystem system,
    CancellationToken cancellationToken);

  /// <summary>
  /// Searches a taxonomy for bounded canonical candidates.
  /// </summary>
  Task<IReadOnlyList<ClassificationCandidateOption>> SearchAsync(
    ClassificationSystem system,
    string query,
    int maximumResults,
    CancellationToken cancellationToken);

  /// <summary>
  /// Resolves one canonical classification snapshot.
  /// </summary>
  Task<StandardClassification> ResolveAsync(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence,
    CancellationToken cancellationToken);
}
