namespace arolariu.Backend.Domain.Invoices.Brokers.TaxonomyCatalog;

using System.Collections.Generic;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions;

/// <summary>Provides canonical taxonomy lookup and search operations.</summary>
public interface ITaxonomyBroker
{
  /// <summary>Gets the embedded artifact version for a system.</summary>
  string GetArtifactVersion(ClassificationSystem system);

  /// <summary>Searches a taxonomy with a bounded result count.</summary>
  IReadOnlyList<TaxonomySearchResult> Search(ClassificationSystem system, string query, int maximumResults);

  /// <summary>Resolves a canonical code into a trusted classification.</summary>
  /// <exception cref="TaxonomyCodeNotFoundException">Thrown when the code is unknown.</exception>
  StandardClassification Resolve(
    ClassificationSystem system,
    string code,
    ClassificationOrigin origin,
    double? confidence,
    IReadOnlyList<ClassificationEvidence> evidence);

  /// <summary>Determines whether a canonical code exists.</summary>
  bool Contains(ClassificationSystem system, string code);
}
