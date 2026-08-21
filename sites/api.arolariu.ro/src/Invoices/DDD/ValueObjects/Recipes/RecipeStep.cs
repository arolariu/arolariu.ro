namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents a single structured step inside a recipe suggestion.
/// </summary>
public sealed record RecipeStep
{
  /// <summary>
  /// Initializes a new instance of the <see cref="RecipeStep"/> record.
  /// </summary>
  /// <param name="sequence">The one-based execution order for the step.</param>
  /// <param name="instruction">The instruction to execute for this step.</param>
  /// <param name="notes">Optional supporting notes for the step.</param>
  /// <exception cref="ArgumentException">Thrown when <paramref name="instruction"/> is null, empty, or whitespace.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="sequence"/> is less than one.</exception>
  public RecipeStep(int sequence, string instruction, string? notes)
  {
    Sequence = AnalysisContractGuards.RequirePositive(sequence, nameof(sequence));
    Instruction = AnalysisContractGuards.RequireText(instruction, nameof(instruction));
    Notes = AnalysisContractGuards.NormalizeOptionalText(notes);
  }

  /// <summary>
  /// Gets the one-based execution order for the step.
  /// </summary>
  public int Sequence { get; }

  /// <summary>
  /// Gets the instruction to execute for this step.
  /// </summary>
  public string Instruction { get; }

  /// <summary>
  /// Gets optional supporting notes for the step.
  /// </summary>
  public string? Notes { get; }
}
