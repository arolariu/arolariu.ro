namespace arolariu.Backend.Domain.Tests.Invoices.DDD.ValueObjects;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using Xunit;

/// <summary>
/// Extended unit tests for the Recipe value object.
/// </summary>
public sealed class RecipeExtendedTests
{
  #region Recipe Creation Tests

  /// <summary>
  /// Validates default Recipe creation.
  /// </summary>
  [Fact]
  public void Recipe_DefaultCreation_HasDefaultValues()
  {
    // Arrange & Act
    var recipe = new Recipe();

    // Assert
    Assert.Equal(string.Empty, recipe.Name);
    Assert.Equal(string.Empty, recipe.Description);
    Assert.Equal(-1, recipe.ApproximateTotalDuration);
    Assert.Equal(RecipeComplexity.UNKNOWN, recipe.Complexity);
    Assert.Empty(recipe.Ingredients);
  }

  /// <summary>
  /// Validates parameterized Recipe creation.
  /// </summary>
  [Fact]
  public void Recipe_ParameterizedCreation_StoresValues()
  {
    // Arrange
    var ingredients = new List<string> { "Flour", "Sugar", "Eggs" };
    var uri = new Uri("https://example.com/recipe");

    // Act
    var recipe = new Recipe(
        "Chocolate Cake",
        "A delicious chocolate cake",
        60,
        RecipeComplexity.NORMAL,
        ingredients,
        uri);

    // Assert
    Assert.Equal("Chocolate Cake", recipe.Name);
    Assert.Equal("A delicious chocolate cake", recipe.Description);
    Assert.Equal(60, recipe.ApproximateTotalDuration);
    Assert.Equal(RecipeComplexity.NORMAL, recipe.Complexity);
    Assert.Equal(3, recipe.Ingredients.Count);
    Assert.Equal(uri, recipe.ReferenceForMoreDetails);
  }

  #endregion

  #region Recipe Property Tests

  /// <summary>
  /// Validates Name property.
  /// </summary>
  [Fact]
  public void Recipe_SetName_StoresValue()
  {
    // Arrange
    var recipe = new Recipe();

    // Act
    recipe.Name = "Pasta Carbonara";

    // Assert
    Assert.Equal("Pasta Carbonara", recipe.Name);
  }

  /// <summary>
  /// Validates Description property.
  /// </summary>
  [Fact]
  public void Recipe_SetDescription_StoresValue()
  {
    // Arrange
    var recipe = new Recipe();

    // Act
    recipe.Description = "A classic Italian pasta dish";

    // Assert
    Assert.Equal("A classic Italian pasta dish", recipe.Description);
  }

  /// <summary>
  /// Validates ApproximateTotalDuration property.
  /// </summary>
  [Fact]
  public void Recipe_SetDuration_StoresValue()
  {
    // Arrange
    var recipe = new Recipe();

    // Act
    recipe.ApproximateTotalDuration = 45;

    // Assert
    Assert.Equal(45, recipe.ApproximateTotalDuration);
  }

  /// <summary>
  /// Validates Complexity property.
  /// </summary>
  [Fact]
  public void Recipe_SetComplexity_StoresValue()
  {
    // Arrange
    var recipe = new Recipe();

    // Act
    recipe.Complexity = RecipeComplexity.HARD;

    // Assert
    Assert.Equal(RecipeComplexity.HARD, recipe.Complexity);
  }

  /// <summary>
  /// Validates ReferenceForMoreDetails property.
  /// </summary>
  [Fact]
  public void Recipe_SetReferenceForMoreDetails_StoresValue()
  {
    // Arrange
    var recipe = new Recipe();
    var uri = new Uri("https://cooking.example.com/recipe/123");

    // Act
    recipe.ReferenceForMoreDetails = uri;

    // Assert
    Assert.Equal(uri, recipe.ReferenceForMoreDetails);
  }

  /// <summary>
  /// Validates default ReferenceForMoreDetails.
  /// </summary>
  [Fact]
  public void Recipe_DefaultReferenceForMoreDetails_IsArolariu()
  {
    // Arrange & Act
    var recipe = new Recipe();

    // Assert
    Assert.Equal("https://arolariu.ro/", recipe.ReferenceForMoreDetails.ToString());
  }

  #endregion

  #region RecipeComplexity Enum Tests

  /// <summary>
  /// Validates RecipeComplexity.UNKNOWN exists.
  /// </summary>
  [Fact]
  public void RecipeComplexity_Unknown_Exists()
  {
    Assert.True(Enum.IsDefined<RecipeComplexity>(RecipeComplexity.UNKNOWN));
  }

  /// <summary>
  /// Validates RecipeComplexity.EASY exists.
  /// </summary>
  [Fact]
  public void RecipeComplexity_Easy_Exists()
  {
    Assert.True(Enum.IsDefined<RecipeComplexity>(RecipeComplexity.EASY));
  }

  /// <summary>
  /// Validates RecipeComplexity.NORMAL exists.
  /// </summary>
  [Fact]
  public void RecipeComplexity_Normal_Exists()
  {
    Assert.True(Enum.IsDefined<RecipeComplexity>(RecipeComplexity.NORMAL));
  }

  /// <summary>
  /// Validates RecipeComplexity.HARD exists.
  /// </summary>
  [Fact]
  public void RecipeComplexity_Hard_Exists()
  {
    Assert.True(Enum.IsDefined<RecipeComplexity>(RecipeComplexity.HARD));
  }

  /// <summary>
  /// Validates RecipeComplexity enum has expected count.
  /// </summary>
  [Fact]
  public void RecipeComplexity_HasExpectedValueCount()
  {
    // Arrange
    var values = Enum.GetValues<RecipeComplexity>();

    // Assert - Should have 4 complexity levels
    Assert.Equal(4, values.Length);
  }

  /// <summary>
  /// Validates all RecipeComplexity values can be assigned.
  /// </summary>
  [Fact]
  public void Recipe_AllComplexityValues_AreValid()
  {
    // Arrange
    var complexities = Enum.GetValues<RecipeComplexity>();

    // Act & Assert
    foreach (var complexity in complexities)
    {
      var recipe = new Recipe { Complexity = complexity };
      Assert.Equal(complexity, recipe.Complexity);
    }
  }

  #endregion

  #region Recipe Edge Cases

  /// <summary>
  /// Validates empty name is allowed.
  /// </summary>
  [Fact]
  public void Recipe_EmptyName_IsAllowed()
  {
    // Arrange & Act
    var recipe = new Recipe { Name = string.Empty };

    // Assert
    Assert.Equal(string.Empty, recipe.Name);
  }

  /// <summary>
  /// Validates long name is allowed.
  /// </summary>
  [Fact]
  public void Recipe_LongName_IsAllowed()
  {
    // Arrange
    var longName = new string('A', 1000);

    // Act
    var recipe = new Recipe { Name = longName };

    // Assert
    Assert.Equal(1000, recipe.Name.Length);
  }

  /// <summary>
  /// Validates negative duration (default).
  /// </summary>
  [Fact]
  public void Recipe_NegativeDuration_IsAllowed()
  {
    // Arrange & Act
    var recipe = new Recipe { ApproximateTotalDuration = -1 };

    // Assert
    Assert.Equal(-1, recipe.ApproximateTotalDuration);
  }

  /// <summary>
  /// Validates zero duration.
  /// </summary>
  [Fact]
  public void Recipe_ZeroDuration_IsAllowed()
  {
    // Arrange & Act
    var recipe = new Recipe { ApproximateTotalDuration = 0 };

    // Assert
    Assert.Equal(0, recipe.ApproximateTotalDuration);
  }

  /// <summary>
  /// Validates large duration.
  /// </summary>
  [Fact]
  public void Recipe_LargeDuration_IsAllowed()
  {
    // Arrange & Act
    var recipe = new Recipe { ApproximateTotalDuration = 10000 };

    // Assert
    Assert.Equal(10000, recipe.ApproximateTotalDuration);
  }

  /// <summary>
  /// Validates unicode in name.
  /// </summary>
  [Fact]
  public void Recipe_UnicodeInName_IsAllowed()
  {
    // Arrange & Act
    var recipe = new Recipe { Name = "Crème brûlée à la française" };

    // Assert
    Assert.True(recipe.Name.Contains("brûlée", StringComparison.Ordinal));
  }

  /// <summary>
  /// Validates special characters in description.
  /// </summary>
  [Fact]
  public void Recipe_SpecialCharactersInDescription_IsAllowed()
  {
    // Arrange & Act
    var recipe = new Recipe { Description = "Use 2-3 eggs & 1/2 cup sugar (or more!)" };

    // Assert
    Assert.True(recipe.Description.Contains('&', StringComparison.Ordinal));
  }

  #endregion

  #region Recipe Ingredients Tests

  /// <summary>
  /// Validates ingredients collection is initialized.
  /// </summary>
  [Fact]
  public void Recipe_DefaultIngredients_IsEmpty()
  {
    // Arrange & Act
    var recipe = new Recipe();

    // Assert
    Assert.NotNull(recipe.Ingredients);
    Assert.Empty(recipe.Ingredients);
  }

  /// <summary>
  /// Validates multiple ingredients.
  /// </summary>
  [Fact]
  public void Recipe_MultipleIngredients_AreStored()
  {
    // Arrange
    var ingredients = new List<string> { "Flour", "Sugar", "Eggs", "Butter", "Milk" };

    // Act
    var recipe = new Recipe(
        "Pancakes",
        "Fluffy pancakes",
        30,
        RecipeComplexity.EASY,
        ingredients,
        new Uri("https://example.com"));

    // Assert
    Assert.Equal(5, recipe.Ingredients.Count);
    Assert.Contains("Flour", recipe.Ingredients);
    Assert.Contains("Butter", recipe.Ingredients);
  }

  /// <summary>
  /// Validates large ingredients collection.
  /// </summary>
  [Fact]
  public void Recipe_LargeIngredientsCollection_IsAllowed()
  {
    // Arrange
    var ingredients = Enumerable.Range(0, 100)
        .Select(i => $"Ingredient{i}")
        .ToList();

    // Act
    var recipe = new Recipe(
        "Complex Dish",
        "Many ingredients",
        120,
        RecipeComplexity.HARD,
        ingredients,
        new Uri("https://example.com"));

    // Assert
    Assert.Equal(100, recipe.Ingredients.Count);
  }

  #endregion

  #region Recipe Record Equality Tests

  /// <summary>
  /// Validates record equality.
  /// </summary>
  [Fact]
  public void Recipe_SameValues_AreEqual()
  {
    // Arrange
    var ingredients = new List<string> { "Flour", "Sugar" };
    var uri = new Uri("https://example.com");

    var recipe1 = new Recipe("Cake", "Delicious", 60, RecipeComplexity.NORMAL, ingredients, uri);
    var recipe2 = new Recipe("Cake", "Delicious", 60, RecipeComplexity.NORMAL, ingredients, uri);

    // Assert - Note: Same reference for ingredients means they're equal
    Assert.Equal(recipe1, recipe2);
  }

  /// <summary>
  /// Validates record inequality for different names.
  /// </summary>
  [Fact]
  public void Recipe_DifferentNames_AreNotEqual()
  {
    // Arrange
    var recipe1 = new Recipe { Name = "Cake" };
    var recipe2 = new Recipe { Name = "Pie" };

    // Assert
    Assert.NotEqual(recipe1, recipe2);
  }

  /// <summary>
  /// Validates record inequality for different complexity.
  /// </summary>
  [Fact]
  public void Recipe_DifferentComplexity_AreNotEqual()
  {
    // Arrange
    var recipe1 = new Recipe { Complexity = RecipeComplexity.EASY };
    var recipe2 = new Recipe { Complexity = RecipeComplexity.HARD };

    // Assert
    Assert.NotEqual(recipe1, recipe2);
  }

  #endregion
}
