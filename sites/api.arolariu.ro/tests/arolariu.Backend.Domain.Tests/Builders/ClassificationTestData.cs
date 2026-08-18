namespace arolariu.Backend.Domain.Tests.Builders;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Provides valid <see cref="StandardClassification"/> instances for tests.
/// </summary>
/// <remarks>
/// <para><b>Why a builder:</b> <see cref="StandardClassification"/> enforces its invariants in the constructor - the
/// hierarchy must be non-empty and its last node's code must equal the selected code. Hand-rolling that in every test
/// is noisy and easy to get subtly wrong, so the valid shape is expressed once here.</para>
/// </remarks>
internal static class ClassificationTestData
{
  /// <summary>
  /// Builds a valid analysis-origin ECOICOP invoice classification.
  /// </summary>
  /// <param name="code">The selected ECOICOP code.</param>
  /// <param name="label">The official label for <paramref name="code"/>.</param>
  /// <returns>A valid classification.</returns>
  public static StandardClassification Ecoicop(string code, string label) =>
    Build(ClassificationSystem.EcoicopV2, "2", code, label, "division");

  /// <summary>
  /// Builds a valid analysis-origin GS1 GPC product classification.
  /// </summary>
  /// <param name="code">The selected GPC brick code.</param>
  /// <param name="label">The official label for <paramref name="code"/>.</param>
  /// <returns>A valid classification.</returns>
  public static StandardClassification Gpc(string code, string label) =>
    Build(ClassificationSystem.Gs1Gpc, "2024", code, label, "brick");

  /// <summary>
  /// Builds a valid analysis-origin NACE merchant classification.
  /// </summary>
  /// <param name="code">The selected NACE code.</param>
  /// <param name="label">The official label for <paramref name="code"/>.</param>
  /// <returns>A valid classification.</returns>
  public static StandardClassification Nace(string code, string label) =>
    Build(ClassificationSystem.Nace21, "2.1", code, label, "class");

  private static StandardClassification Build(
    ClassificationSystem system,
    string version,
    string code,
    string label,
    string level) =>
    new(
      system,
      version,
      code,
      label,
      new List<ClassificationNode> { new(level, code, label) },
      ClassificationOrigin.Analysis,
      0.9,
      new List<ClassificationEvidence>());
}
