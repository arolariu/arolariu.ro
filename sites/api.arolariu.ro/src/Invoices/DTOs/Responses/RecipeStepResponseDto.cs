namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Represents one ordered, actionable step in a recipe suggestion.
/// </summary>
/// <param name="Sequence">The one-based step order.</param>
/// <param name="Instruction">The instruction to perform.</param>
/// <param name="Notes">Optional notes that clarify the instruction.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeStepResponseDto(
  [property: JsonPropertyName("sequence")] int Sequence,
  [property: JsonPropertyName("instruction")] string Instruction,
  [property: JsonPropertyName("notes")] string? Notes)
{
  /// <summary>
  /// Projects a recipe step into its public transport representation.
  /// </summary>
  /// <param name="step">The recipe step to project.</param>
  /// <returns>An immutable recipe-step response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="step"/> is null.</exception>
  public static RecipeStepResponseDto FromRecipeStep(RecipeStep step)
  {
    ArgumentNullException.ThrowIfNull(step);
    return new(step.Sequence, step.Instruction, step.Notes);
  }
}
