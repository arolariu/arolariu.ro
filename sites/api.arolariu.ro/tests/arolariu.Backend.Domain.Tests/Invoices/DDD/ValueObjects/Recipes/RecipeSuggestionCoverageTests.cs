namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects.Recipes;

using System;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Tests coverage-sensitive recipe suggestion constructor branches and record members.
/// </summary>
[TestClass]
public sealed class RecipeSuggestionCoverageTests
{
  /// <summary>
  /// Verifies recipe suggestion constructor difficulty, steps, total duration, and valid boundary branches.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestion_ConstructorBoundaries_ExercisesGuardBranches()
  {
    RecipeSuggestion recipe = CreateRecipeSuggestion(totalMinutes: 3);

    Assert.AreEqual(3, recipe.TotalMinutes);
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateRecipeSuggestion(difficulty: (RecipeDifficulty)999));
    Assert.ThrowsExactly<ArgumentException>(() => CreateRecipeSuggestion(steps: []));
    Assert.ThrowsExactly<ArgumentOutOfRangeException>(() => CreateRecipeSuggestion(totalMinutes: 2));
  }

  /// <summary>
  /// Verifies record equality, hashing, string formatting, null comparison, and cloning for recipe suggestions.
  /// </summary>
  [TestMethod]
  public void RecipeSuggestion_EquivalentRecords_ExercisesRecordMembers()
  {
    RecipeSuggestion recipe = CreateRecipeSuggestion();
    RecipeSuggestion different = CreateRecipeSuggestion(name: "Pasta");
    RecipeSuggestion copy = recipe with { };
    RecipeSuggestion? missing = null;

    Assert.IsTrue(recipe.Equals(copy));
    Assert.AreEqual(recipe.GetHashCode(), copy.GetHashCode());
    Assert.IsFalse(recipe.Equals(different));
    Assert.IsFalse(recipe.Equals(missing));
    Assert.AreEqual(recipe, copy);
    StringAssert.Contains(recipe.ToString(), nameof(RecipeSuggestion.TotalMinutes), StringComparison.Ordinal);
  }

  private static RecipeSuggestion CreateRecipeSuggestion(
    string name = "Toast",
    RecipeDifficulty difficulty = RecipeDifficulty.Easy,
    RecipeStep[]? steps = null,
    int totalMinutes = 3) =>
      new(
        name,
        "Quick toast",
        1,
        1,
        2,
        totalMinutes,
        difficulty,
        [new RecipeIngredient("Bread", "1 slice", null)],
        [],
        [],
        steps ?? [new RecipeStep(1, "Toast bread.", null)],
        [AllergenCode.CerealsContainingGluten],
        Guid.Parse("55555555-5555-5555-5555-555555555555"));
}

