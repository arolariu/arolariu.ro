namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

/// <summary>
/// Represents the immutable transient allergen assessments for a batch of analyzed products.
/// </summary>
public sealed record ProductAllergenAssessmentResult
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductAllergenAssessmentResult"/> record.
  /// </summary>
  /// <param name="assessments">The allergen assessments keyed by transient product correlation token.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="assessments"/> is null.</exception>
  /// <exception cref="ArgumentException">
  /// Thrown when any correlation token is null, empty, whitespace, or duplicated, or when any assessment is null.
  /// </exception>
  public ProductAllergenAssessmentResult(IReadOnlyDictionary<string, ProductAllergenAssessment> assessments)
  {
    ArgumentNullException.ThrowIfNull(assessments);

    var snapshot = new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal);

    foreach (KeyValuePair<string, ProductAllergenAssessment> entry in assessments)
    {
      if (string.IsNullOrWhiteSpace(entry.Key))
      {
        throw new ArgumentException("Assessment correlation tokens must not be null, empty, or whitespace.", nameof(assessments));
      }

      ArgumentNullException.ThrowIfNull(entry.Value);
      snapshot.Add(entry.Key, entry.Value);
    }

    Assessments = new ReadOnlyDictionary<string, ProductAllergenAssessment>(snapshot);
  }

  /// <summary>Gets the allergen assessments keyed by transient product correlation token.</summary>
  public IReadOnlyDictionary<string, ProductAllergenAssessment> Assessments { get; }
}

/// <summary>
/// Represents the structured allergen outcome for a single transient product.
/// </summary>
public sealed record ProductAllergenAssessment
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductAllergenAssessment"/> record.
  /// </summary>
  /// <param name="status">The overall outcome of the product allergen assessment.</param>
  /// <param name="signals">The allergen signals produced for the product.</param>
  /// <exception cref="ArgumentException">
  /// Thrown when <paramref name="status"/> and <paramref name="signals"/> contradict each other or contain duplicate allergen codes.
  /// </exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="signals"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="status"/> is not a defined status.</exception>
  public ProductAllergenAssessment(
    ProductAllergenAssessmentStatus status,
    IReadOnlyList<ProductAllergenSignal> signals)
  {
    if (!Enum.IsDefined(status))
    {
      throw new ArgumentOutOfRangeException(nameof(status), status, "Status must be a defined product allergen assessment status.");
    }

    Status = status;
    Signals = AnalysisContractGuards.Snapshot(signals, nameof(signals));

    if (Status == ProductAllergenAssessmentStatus.SignalsFound && Signals.Count == 0)
    {
      throw new ArgumentException("SignalsFound assessments must contain at least one signal.", nameof(signals));
    }

    if (Status != ProductAllergenAssessmentStatus.SignalsFound && Signals.Count != 0)
    {
      throw new ArgumentException("Only SignalsFound assessments may contain signals.", nameof(signals));
    }

    var seenCodes = new HashSet<AllergenCode>();

    foreach (ProductAllergenSignal signal in Signals)
    {
      if (!seenCodes.Add(signal.Code))
      {
        throw new ArgumentException($"Duplicate allergen code '{signal.Code}' is not permitted for a single product assessment.", nameof(signals));
      }
    }
  }

  /// <summary>Gets the overall outcome of the product allergen assessment.</summary>
  public ProductAllergenAssessmentStatus Status { get; }

  /// <summary>Gets the allergen signals produced for the product.</summary>
  public IReadOnlyList<ProductAllergenSignal> Signals { get; }

  /// <summary>
  /// Creates a signals-found product allergen assessment.
  /// </summary>
  /// <param name="signals">The allergen signals produced for the product.</param>
  /// <returns>A signals-found product allergen assessment.</returns>
  public static ProductAllergenAssessment SignalsFound(IReadOnlyList<ProductAllergenSignal> signals) =>
    new(ProductAllergenAssessmentStatus.SignalsFound, signals);

  /// <summary>
  /// Creates a no-signals assessment.
  /// </summary>
  /// <returns>A product allergen assessment with no signals in the available evidence.</returns>
  public static ProductAllergenAssessment NoSignalsInAvailableEvidence() =>
    new(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence, []);

  /// <summary>
  /// Creates an insufficient-data assessment.
  /// </summary>
  /// <returns>A product allergen assessment with insufficient data.</returns>
  public static ProductAllergenAssessment InsufficientData() =>
    new(ProductAllergenAssessmentStatus.InsufficientData, []);
}

/// <summary>
/// Describes the structured outcome of one product-level allergen assessment.
/// </summary>
public enum ProductAllergenAssessmentStatus
{
  /// <summary>The assessment found one or more allergen signals.</summary>
  SignalsFound,

  /// <summary>The assessment succeeded but found no signals in the available evidence.</summary>
  NoSignalsInAvailableEvidence,

  /// <summary>The assessment ran but lacked sufficient evidence for a reliable result.</summary>
  InsufficientData,
}

/// <summary>
/// Represents one structured allergen signal for a transient product.
/// </summary>
public sealed record ProductAllergenSignal
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ProductAllergenSignal"/> record.
  /// </summary>
  /// <param name="code">The canonical EU-14 allergen code.</param>
  /// <param name="evidenceTier">The evidence tier supporting the allergen signal.</param>
  /// <param name="confidence">The confidence score in the inclusive range <c>[0, 1]</c>.</param>
  /// <param name="evidence">The supporting evidence items for the signal.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="evidence"/> is empty.</exception>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="evidence"/> is null.</exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when <paramref name="code"/>, <paramref name="evidenceTier"/>, or <paramref name="confidence"/> is invalid.
  /// </exception>
  public ProductAllergenSignal(
    AllergenCode code,
    ProductAllergenEvidenceTier evidenceTier,
    double confidence,
    IReadOnlyList<AllergenEvidence> evidence)
  {
    if (!Enum.IsDefined(code))
    {
      throw new ArgumentOutOfRangeException(nameof(code), code, "Allergen code must be a defined EU-14 member.");
    }

    if (!Enum.IsDefined(evidenceTier))
    {
      throw new ArgumentOutOfRangeException(nameof(evidenceTier), evidenceTier, "Evidence tier must be a defined product allergen evidence tier.");
    }

    Code = code;
    EvidenceTier = evidenceTier;
    Confidence = AnalysisContractGuards.RequireConfidence(confidence, nameof(confidence));
    Evidence = AnalysisContractGuards.Snapshot(evidence, nameof(evidence));

    if (Evidence.Count == 0)
    {
      throw new ArgumentException("Product allergen signals must contain at least one evidence item.", nameof(evidence));
    }
  }

  /// <summary>Gets the canonical EU-14 allergen code.</summary>
  public AllergenCode Code { get; }

  /// <summary>Gets the evidence tier supporting the allergen signal.</summary>
  public ProductAllergenEvidenceTier EvidenceTier { get; }

  /// <summary>Gets the confidence score in the inclusive range <c>[0, 1]</c>.</summary>
  public double Confidence { get; }

  /// <summary>Gets the evidence items supporting the allergen signal.</summary>
  public IReadOnlyList<AllergenEvidence> Evidence { get; }
}

/// <summary>
/// Describes the confidence tier for one product-level allergen signal.
/// </summary>
public enum ProductAllergenEvidenceTier
{
  /// <summary>The allergen is explicitly declared by ingredients or allergen statements.</summary>
  Declared,

  /// <summary>The allergen is strongly suggested by the available evidence but not explicitly declared.</summary>
  Likely,

  /// <summary>The allergen is weakly suggested by the available evidence.</summary>
  Possible,
}
