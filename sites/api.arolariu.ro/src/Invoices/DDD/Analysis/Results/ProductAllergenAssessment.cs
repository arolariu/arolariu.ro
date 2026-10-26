namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.Serialization;

/// <summary>Represents the structured allergen outcome for one transient product.</summary>
public sealed record ProductAllergenAssessment
{
  /// <summary>Initializes one structured product allergen assessment.</summary>
  public ProductAllergenAssessment(
    ProductAllergenAssessmentStatus status,
    IReadOnlyList<ProductAllergenSignal> signals)
  {
    if (!Enum.IsDefined(status))
    {
      throw new ArgumentOutOfRangeException(nameof(status), status, "Status must be defined.");
    }

    Status = status;
    Signals = AnalysisContractGuards.Snapshot(signals, nameof(signals));

    if (Status == ProductAllergenAssessmentStatus.SignalsFound && Signals.Count == 0)
    {
      throw new ArgumentException("SignalsFound assessments require signals.", nameof(signals));
    }

    if (Status != ProductAllergenAssessmentStatus.SignalsFound && Signals.Count != 0)
    {
      throw new ArgumentException("Only SignalsFound assessments may contain signals.", nameof(signals));
    }
  }

  /// <summary>Gets the structured assessment status.</summary>
  public ProductAllergenAssessmentStatus Status { get; }

  /// <summary>Gets the structured allergen signals.</summary>
  public IReadOnlyList<ProductAllergenSignal> Signals { get; }

  /// <summary>Creates a signals-found assessment.</summary>
  public static ProductAllergenAssessment SignalsFound(IReadOnlyList<ProductAllergenSignal> signals) =>
    new(ProductAllergenAssessmentStatus.SignalsFound, signals);

  /// <summary>Creates a successful no-signals assessment.</summary>
  public static ProductAllergenAssessment NoSignalsInAvailableEvidence() =>
    new(ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence, []);

  /// <summary>Creates an insufficient-data assessment.</summary>
  public static ProductAllergenAssessment InsufficientData() =>
    new(ProductAllergenAssessmentStatus.InsufficientData, []);
}

/// <summary>Describes one structured product allergen assessment status.</summary>
[JsonConverter(typeof(StrictStringEnumConverter<ProductAllergenAssessmentStatus>))]
public enum ProductAllergenAssessmentStatus
{
  /// <summary>One or more allergen signals were found.</summary>
  [JsonStringEnumMemberName("signalsFound")]
  SignalsFound,

  /// <summary>No signals were found in the available evidence.</summary>
  [JsonStringEnumMemberName("noSignalsInAvailableEvidence")]
  NoSignalsInAvailableEvidence,

  /// <summary>The available evidence was insufficient.</summary>
  [JsonStringEnumMemberName("insufficientData")]
  InsufficientData,
}

/// <summary>Represents one structured allergen signal for a transient product.</summary>
public sealed record ProductAllergenSignal
{
  /// <summary>Initializes one structured product allergen signal.</summary>
  public ProductAllergenSignal(
    AllergenCode code,
    ProductAllergenEvidenceTier evidenceTier,
    double confidence,
    IReadOnlyList<AllergenEvidence> evidence)
  {
    if (!Enum.IsDefined(code))
    {
      throw new ArgumentOutOfRangeException(nameof(code), code, "Code must be defined.");
    }

    if (!Enum.IsDefined(evidenceTier))
    {
      throw new ArgumentOutOfRangeException(nameof(evidenceTier), evidenceTier, "Evidence tier must be defined.");
    }

    Code = code;
    EvidenceTier = evidenceTier;
    Confidence = AnalysisContractGuards.RequireConfidence(confidence, nameof(confidence));
    Evidence = AnalysisContractGuards.Snapshot(evidence, nameof(evidence));

    if (Evidence.Count == 0)
    {
      throw new ArgumentException("Product allergen signals require evidence.", nameof(evidence));
    }
  }

  /// <summary>Gets the EU-14 allergen code.</summary>
  public AllergenCode Code { get; }

  /// <summary>Gets the structured evidence tier.</summary>
  public ProductAllergenEvidenceTier EvidenceTier { get; }

  /// <summary>Gets the confidence score.</summary>
  public double Confidence { get; }

  /// <summary>Gets the supporting evidence.</summary>
  public IReadOnlyList<AllergenEvidence> Evidence { get; }
}

/// <summary>Describes one structured product allergen evidence tier.</summary>
[JsonConverter(typeof(StrictStringEnumConverter<ProductAllergenEvidenceTier>))]
public enum ProductAllergenEvidenceTier
{
  /// <summary>The allergen was explicitly declared.</summary>
  [JsonStringEnumMemberName("declared")]
  Declared,

  /// <summary>The allergen is strongly suggested.</summary>
  [JsonStringEnumMemberName("likely")]
  Likely,

  /// <summary>The allergen is weakly suggested.</summary>
  [JsonStringEnumMemberName("possible")]
  Possible,
}
