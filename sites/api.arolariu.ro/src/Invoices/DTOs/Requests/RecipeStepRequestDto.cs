namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>Client-supplied recipe step for a read-modify-write workflow.</summary>
/// <param name="Sequence">The one-based execution order for the step.</param>
/// <param name="Instruction">The instruction to execute for this step.</param>
/// <param name="Notes">Optional supporting notes for the step.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeStepRequestDto(
  [property: JsonPropertyName("sequence")] int Sequence,
  [property: JsonPropertyName("instruction")][Required] string Instruction,
  [property: JsonPropertyName("notes")] string? Notes)
{
  /// <summary>Converts this DTO into its domain value object.</summary>
  /// <returns>The mapped <see cref="RecipeStep"/>.</returns>
  public RecipeStep ToRecipeStep() => new(Sequence, Instruction, Notes);
}
