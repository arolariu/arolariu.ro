namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects.Classifications;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests coverage-sensitive classification value object branches and record members.
/// </summary>
[TestClass]
public sealed class ClassificationCoverageTests
{
  private static T? NullOf<T>() where T : class => null;
  /// <summary>
  /// Verifies classification confidence rules for null, lower, upper, and valid boundary values.
  /// </summary>
  [TestMethod]
  public void StandardClassification_ConfidenceBoundaries_ExercisesRequireConfidenceBranches()
  {
    StandardClassification manual = CreateManualClassification();
    StandardClassification zero = CreateAnalysisClassification(confidence: 0);
    StandardClassification one = CreateAnalysisClassification(confidence: 1);

    Assert.IsNull(manual.Confidence);
    Assert.AreEqual(0, zero.Confidence);
    Assert.AreEqual(1, one.Confidence);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateAnalysisClassification(confidence: -0.01));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateAnalysisClassification(confidence: 1.01));
  }

  /// <summary>
  /// Verifies classification snapshot null guards and valid non-null collection snapshots.
  /// </summary>
  [TestMethod]
  public void StandardClassification_SnapshotBoundaries_ExercisesNullAndNonNullBranches()
  {
    StandardClassification classification = CreateAnalysisClassification();

    Assert.AreEqual(1, classification.Hierarchy.Count);
    Assert.AreEqual(1, classification.Evidence.Count);
    Assert.ThrowsExactly<ArgumentNullException>(() => new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01",
      "Food",
      null!,
      ClassificationOrigin.Analysis,
      0.9,
      [new ClassificationEvidence("product.name", "Food")]));
    Assert.ThrowsExactly<ArgumentNullException>(() => new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2",
      "01",
      "Food",
      [new ClassificationNode("division", "01", "Food")],
      ClassificationOrigin.Analysis,
      0.9,
      null!));
  }

  /// <summary>
  /// Verifies equivalent, different-length, and same-length-different-content sequence comparison branches.
  /// </summary>
  [TestMethod]
  public void StandardClassification_SequenceComparisons_ExerciseHaveEquivalentSequenceBranches()
  {
    StandardClassification first = CreateAnalysisClassification(
      hierarchy: [new ClassificationNode("division", "01", "Food")],
      evidence: [new ClassificationEvidence("product.name", "Bread")]);
    StandardClassification equal = CreateAnalysisClassification(
      hierarchy: [new ClassificationNode("division", "01", "Food")],
      evidence: [new ClassificationEvidence("product.name", "Bread")]);
    StandardClassification differentLength = CreateAnalysisClassification(
      code: "01.1",
      officialLabel: "Food group",
      hierarchy:
      [
        new ClassificationNode("division", "01", "Food"),
        new ClassificationNode("group", "01.1", "Food group")
      ],
      evidence: [new ClassificationEvidence("product.name", "Bread")]);
    StandardClassification differentContent = CreateAnalysisClassification(
      hierarchy: [new ClassificationNode("division", "01", "Food")],
      evidence: [new ClassificationEvidence("product.name", "Milk")]);

    Assert.IsTrue(first.Equals(equal));
    Assert.IsFalse(first.Equals(differentLength));
    Assert.IsFalse(first.Equals(differentContent));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for standard classifications.
  /// </summary>
  [TestMethod]
  public void StandardClassification_EquivalentRecords_ExercisesRecordMembers()
  {
    StandardClassification classification = CreateAnalysisClassification();
    StandardClassification equal = CreateAnalysisClassification();
    StandardClassification different = CreateAnalysisClassification(code: "02", officialLabel: "Beverages");
    StandardClassification copy = classification with { };

    Assert.IsTrue(classification.Equals(equal));
    Assert.AreEqual(classification.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(classification.Equals(different));
    Assert.IsFalse(classification.Equals(NullOf<object>()));
    Assert.AreEqual(classification, copy);
    StringAssert.Contains(classification.ToString(), nameof(StandardClassification.OfficialLabel), StringComparison.Ordinal);
  }

  /// <summary>
  /// Verifies classification evidence source and value getters.
  /// </summary>
  [TestMethod]
  public void ClassificationEvidence_ValidInput_ExposesSourceAndValue()
  {
    var evidence = new ClassificationEvidence(" product.name ", " wholegrain bread ");

    Assert.AreEqual("product.name", evidence.Source);
    Assert.AreEqual("wholegrain bread", evidence.Value);
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for classification evidence.
  /// </summary>
  [TestMethod]
  public void ClassificationEvidence_EquivalentRecords_ExercisesRecordMembers()
  {
    var evidence = new ClassificationEvidence("product.name", "bread");
    var equal = new ClassificationEvidence("product.name", "bread");
    var different = new ClassificationEvidence("product.name", "milk");
    ClassificationEvidence copy = evidence with { };

    Assert.IsTrue(evidence.Equals(equal));
    Assert.AreEqual(evidence.GetHashCode(), equal.GetHashCode());
    Assert.IsFalse(evidence.Equals(different));
    Assert.IsFalse(evidence.Equals(NullOf<object>()));
    Assert.AreEqual(evidence, copy);
    StringAssert.Contains(evidence.ToString(), nameof(ClassificationEvidence.Source), StringComparison.Ordinal);
  }

  private static StandardClassification CreateManualClassification() =>
    new(
      ClassificationSystem.EcoicopV2,
      "2",
      "01",
      "Food",
      [new ClassificationNode("division", "01", "Food")],
      ClassificationOrigin.Manual,
      null,
      []);

  private static StandardClassification CreateAnalysisClassification(
    string code = "01",
    string officialLabel = "Food",
    ClassificationNode[]? hierarchy = null,
    ClassificationEvidence[]? evidence = null,
    double confidence = 0.9) =>
      new(
        ClassificationSystem.EcoicopV2,
        "2",
        code,
        officialLabel,
        hierarchy ?? [new ClassificationNode("division", code, officialLabel)],
        ClassificationOrigin.Analysis,
        confidence,
        evidence ?? [new ClassificationEvidence("product.name", officialLabel)]);
}
