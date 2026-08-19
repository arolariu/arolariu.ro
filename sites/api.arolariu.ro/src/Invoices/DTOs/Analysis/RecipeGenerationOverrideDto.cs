namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

/// <summary>
/// Represents a caller-supplied override for the recipe generation capability, including its result cap.
/// </summary>
/// <remarks>
/// <para>When <paramref name="Enabled"/> is <see langword="true"/> and <paramref name="MaximumRecipes"/> is omitted, the
/// domain ceiling of three recipes is applied. When <paramref name="Enabled"/> is <see langword="false"/>, a non-zero
/// <paramref name="MaximumRecipes"/> is rejected rather than silently ignored.</para>
/// </remarks>
/// <param name="Enabled">Whether recipe generation should execute during the run.</param>
/// <param name="MaximumRecipes">The maximum number of recipe suggestions to produce, in the inclusive range 1 to 3.</param>
[Serializable]
public readonly record struct RecipeGenerationOverrideDto(
  bool Enabled,
  int? MaximumRecipes);
