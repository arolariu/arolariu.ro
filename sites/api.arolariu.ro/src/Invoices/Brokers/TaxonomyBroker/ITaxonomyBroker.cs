namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Provides canonical taxonomy catalog lookup and search operations for invoice classification workflows.
/// </summary>
/// <remarks>
/// <para><b>Role (Broker Standard):</b> This broker is a thin read-only abstraction over generated taxonomy artifacts embedded in the invoices assembly or injected for testing.</para>
/// <para><b>Exclusions:</b> It performs no business orchestration, persistence, retry logic, or fallback taxonomic inference.</para>
/// </remarks>
public interface ITaxonomyBroker
{
  /// <summary>
  /// Retrieves the version declared by the trusted generated taxonomy artifact for a classification system.
  /// </summary>
  /// <param name="system">The taxonomy system whose artifact version is requested.</param>
  /// <returns>The non-empty version declared by the selected validated taxonomy artifact.</returns>
  string GetArtifactVersion(ClassificationSystem system);

  /// <summary>
  /// Searches a taxonomy artifact using normalized token overlap ranking.
  /// </summary>
  /// <param name="system">The taxonomy system to search.</param>
  /// <param name="query">The raw search query text or canonical taxonomy code.</param>
  /// <param name="maximumResults">The caller-requested maximum number of results. Values above 50 are capped to 50.</param>
  /// <returns>An ordered list of canonical search hits for the requested taxonomy.</returns>
  /// <exception cref="System.ArgumentException">Thrown when <paramref name="query"/> is null, empty, or whitespace.</exception>
  /// <exception cref="System.ArgumentOutOfRangeException">Thrown when <paramref name="maximumResults"/> is less than or equal to zero.</exception>
  IReadOnlyList<TaxonomySearchResult> Search(
    ClassificationSystem system,
    string query,
    int maximumResults);

  /// <summary>
  /// Resolves a canonical taxonomy code into a complete immutable classification value.
  /// </summary>
  /// <param name="system">The taxonomy system containing the code.</param>
  /// <param name="code">The canonical taxonomy code to resolve.</param>
  /// <param name="origin">The source of the classification decision.</param>
  /// <param name="confidence">The analysis confidence score; MUST be null for manual selections.</param>
  /// <param name="evidence">The evidence items supporting the classification decision.</param>
  /// <returns>A canonical immutable classification value built from the taxonomy catalog.</returns>
  /// <exception cref="System.ArgumentException">Thrown when <paramref name="code"/> is invalid or when origin/confidence rules are violated.</exception>
  /// <exception cref="System.ArgumentOutOfRangeException">Thrown when <paramref name="confidence"/> is outside the inclusive range <c>[0, 1]</c>.</exception>
  /// <exception cref="TaxonomyCodeNotFoundException">Thrown when the supplied code does not exist in the requested taxonomy system.</exception>
  StandardClassification Resolve(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence);

  /// <summary>
  /// Determines whether a canonical taxonomy code exists within a taxonomy system.
  /// </summary>
  /// <param name="system">The taxonomy system to inspect.</param>
  /// <param name="code">The canonical taxonomy code to test.</param>
  /// <returns><see langword="true"/> when the code exists; otherwise, <see langword="false"/>.</returns>
  /// <exception cref="System.ArgumentException">Thrown when <paramref name="code"/> is null, empty, or whitespace.</exception>
  bool Contains(ClassificationSystem system, string code);
}
