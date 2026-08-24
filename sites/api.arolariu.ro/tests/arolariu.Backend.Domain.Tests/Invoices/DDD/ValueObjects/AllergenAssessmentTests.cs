namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Defines invariant tests for EU-14 allergen contracts.
/// </summary>
[TestClass]
public sealed class AllergenAssessmentTests
{
  /// <summary>
  /// Verifies that no-signal outcomes are distinct from insufficient-data outcomes.
  /// </summary>
  [TestMethod]
  public void AllergenAssessment_NoSignals_IsDifferentFromInsufficientData()
  {
    // Arrange
    AllergenAssessment noSignals = AllergenAssessment.NoSignals();
    AllergenAssessment insufficient = AllergenAssessment.Insufficient();

    // Assert
    Assert.AreNotEqual(noSignals.Status, insufficient.Status);
  }

  /// <summary>
  /// Verifies that the contract exposes exactly the EU-14 allergen codes.
  /// </summary>
  [TestMethod]
  public void AllergenCode_ContainsExactEu14Members()
  {
    // Arrange
    string[] names = Enum.GetNames<AllergenCode>();

    // Assert
    CollectionAssert.AreEquivalent(
      new[]
      {
        nameof(AllergenCode.CerealsContainingGluten),
        nameof(AllergenCode.Crustaceans),
        nameof(AllergenCode.Eggs),
        nameof(AllergenCode.Fish),
        nameof(AllergenCode.Peanuts),
        nameof(AllergenCode.Soybeans),
        nameof(AllergenCode.Milk),
        nameof(AllergenCode.Nuts),
        nameof(AllergenCode.Celery),
        nameof(AllergenCode.Mustard),
        nameof(AllergenCode.Sesame),
        nameof(AllergenCode.SulphurDioxideAndSulphites),
        nameof(AllergenCode.Lupin),
        nameof(AllergenCode.Molluscs)
      },
      names);

    CollectionAssert.DoesNotContain(names, "Lactose");
    CollectionAssert.DoesNotContain(names, "Dairy");
    CollectionAssert.DoesNotContain(names, "Shellfish");
  }

  /// <summary>
  /// Verifies that detected assessments snapshot their supplied signals.
  /// </summary>
  [TestMethod]
  public void AllergenAssessment_Detected_SnapshotsSignals()
  {
    // Arrange
    var evidence = new List<AllergenEvidence>
    {
      new("ocr.product-name", "peanut butter")
    };

    var signals = new List<AllergenSignal>
    {
      new(AllergenCode.Peanuts, AllergenEvidenceLevel.Explicit, 0.91, evidence)
    };

    // Act
    AllergenAssessment assessment = AllergenAssessment.Detected(signals);
    signals.Clear();
    evidence.Add(new AllergenEvidence("manual-note", "contains traces"));

    // Assert
    Assert.AreEqual(AllergenAssessmentStatus.Detected, assessment.Status);
    Assert.AreEqual(1, assessment.Signals.Count);
    Assert.AreEqual(1, assessment.Signals[0].Evidence.Count);
  }

  /// <summary>
  /// Verifies that detected assessments require at least one signal.
  /// </summary>
  [TestMethod]
  public void AllergenAssessment_DetectedWithoutSignals_ThrowsArgumentException() =>
    Assert.ThrowsExactly<ArgumentException>(() => AllergenAssessment.Detected([]));

  /// <summary>
  /// Verifies that allergen signals enforce confidence bounds.
  /// </summary>
  [TestMethod]
  public void AllergenSignal_ConfidenceOutsideUnitInterval_ThrowsArgumentOutOfRangeException() =>
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new AllergenSignal(
      AllergenCode.Milk,
      AllergenEvidenceLevel.Inferred,
      1.01,
      [new AllergenEvidence("ocr.product-name", "milk chocolate")]));
}
