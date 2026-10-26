namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects.Allergens;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests coverage-sensitive allergen value object constructor branches and record members.
/// </summary>
[TestClass]
public sealed class AllergenValueObjectCoverageTests
{
  /// <summary>
  /// Verifies allergen signal constructor enum, confidence, null, empty, and valid boundary branches.
  /// </summary>
  [TestMethod]
  public void AllergenSignal_ConstructorBoundaries_ExercisesGuardBranches()
  {
    AllergenSignal minimum = CreateSignal(0);
    AllergenSignal maximum = CreateSignal(1);

    Assert.AreEqual(0, minimum.Confidence);
    Assert.AreEqual(1, maximum.Confidence);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new AllergenSignal((AllergenCode)999, AllergenEvidenceLevel.Explicit, 0.5, [CreateEvidence()]));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new AllergenSignal(AllergenCode.Milk, (AllergenEvidenceLevel)999, 0.5, [CreateEvidence()]));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new AllergenSignal(AllergenCode.Milk, AllergenEvidenceLevel.Explicit, 1.01, [CreateEvidence()]));
    Assert.ThrowsExactly<ArgumentNullException>(() => new AllergenSignal(AllergenCode.Milk, AllergenEvidenceLevel.Explicit, 0.5, null!));
    Assert.ThrowsExactly<ArgumentException>(() => new AllergenSignal(AllergenCode.Milk, AllergenEvidenceLevel.Explicit, 0.5, []));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for allergen signals.
  /// </summary>
  [TestMethod]
  public void AllergenSignal_EquivalentRecords_ExercisesRecordMembers()
  {
    AllergenSignal signal = CreateSignal();
    AllergenSignal different = new(AllergenCode.Eggs, AllergenEvidenceLevel.Inferred, 0.7, [new AllergenEvidence("ingredients", "eggs")]);
    AllergenSignal copy = signal with { };
    AllergenSignal? missing = null;

    Assert.IsTrue(signal.Equals(copy));
    Assert.AreEqual(signal.GetHashCode(), copy.GetHashCode());
    Assert.IsFalse(signal.Equals(different));
    Assert.IsFalse(signal.Equals(missing));
    Assert.AreEqual(signal, copy);
    StringAssert.Contains(signal.ToString(), nameof(AllergenSignal.EvidenceLevel), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies allergen assessment constructor status and signal consistency branches.
  /// </summary>
  [TestMethod]
  public void AllergenAssessment_StatusAndSignals_ExercisesConstructorBranches()
  {
    AllergenSignal signal = CreateSignal();

    Assert.AreEqual(AllergenAssessmentStatus.NoSignals, AllergenAssessment.NoSignals().Status);
    Assert.AreEqual(AllergenAssessmentStatus.InsufficientData, AllergenAssessment.Insufficient().Status);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => new AllergenAssessment((AllergenAssessmentStatus)999, []));
    Assert.ThrowsExactly<ArgumentNullException>(() => new AllergenAssessment(AllergenAssessmentStatus.NoSignals, null!));
    Assert.ThrowsExactly<ArgumentException>(() => AllergenAssessment.Detected([]));
    Assert.ThrowsExactly<ArgumentException>(() => new AllergenAssessment(AllergenAssessmentStatus.NoSignals, [signal]));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for allergen assessments.
  /// </summary>
  [TestMethod]
  public void AllergenAssessment_EquivalentRecords_ExercisesRecordMembers()
  {
    AllergenAssessment assessment = AllergenAssessment.Detected([CreateSignal()]);
    AllergenAssessment different = AllergenAssessment.Insufficient();
    AllergenAssessment copy = assessment with { };
    AllergenAssessment? missing = null;

    Assert.IsTrue(assessment.Equals(copy));
    Assert.AreEqual(assessment.GetHashCode(), copy.GetHashCode());
    Assert.IsFalse(assessment.Equals(different));
    Assert.IsFalse(assessment.Equals(missing));
    Assert.AreEqual(assessment, copy);
    StringAssert.Contains(assessment.ToString(), nameof(AllergenAssessment.Signals), StringComparison.Ordinal);
  }

  private static AllergenSignal CreateSignal(double confidence = 0.8) =>
    new(AllergenCode.Milk, AllergenEvidenceLevel.Explicit, confidence, [CreateEvidence()]);

  private static AllergenEvidence CreateEvidence() =>
    new("ingredients", "milk");
}




