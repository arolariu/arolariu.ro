namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Newtonsoft.Json;

/// <summary>
/// Guards the persistence round-trip of the analysis value objects introduced by the analysis cutover.
/// </summary>
/// <remarks>
/// <para><b>Why this suite exists:</b> <c>CosmosDatabaseBroker</c> performs every read and write through the raw
/// <c>CosmosClient</c> container APIs, so the entities are serialized by the Cosmos SDK's own serializer rather than
/// by Entity Framework. The <c>OnModelCreating</c> value-converter configuration therefore never participates in a
/// production round-trip, and asserting on it would prove nothing about real behaviour.</para>
/// <para><b>What is actually at risk:</b> the cutover replaced flat enums with immutable records that expose get-only
/// <see cref="IReadOnlyList{T}"/> members and enforce their invariants inside validating constructors. A serializer
/// that cannot bind those constructors would either drop data silently or throw on every read. These tests exercise
/// the serializer the SDK actually uses so that failure mode is caught here rather than in production.</para>
/// </remarks>
[TestClass]
public sealed class AnalysisPersistenceSerializationTests
{
  #region Invoice

  /// <summary>
  /// Verifies an invoice classification survives a serializer round-trip with its hierarchy intact.
  /// </summary>
  [TestMethod]
  public void Invoice_Classification_SurvivesSerializerRoundTrip()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Classification = ClassificationTestData.Ecoicop("01.1.1", "Bread and cereals"),
    };

    // Act
    Invoice roundTripped = RoundTrip(invoice);

    // Assert
    Assert.IsNotNull(roundTripped.Classification);
    Assert.AreEqual("01.1.1", roundTripped.Classification.Code);
    Assert.AreEqual("Bread and cereals", roundTripped.Classification.OfficialLabel);
    Assert.HasCount(1, roundTripped.Classification.Hierarchy, "The hierarchy must not be flattened away.");
    Assert.AreEqual("01.1.1", roundTripped.Classification.Hierarchy[^1].Code);
  }

  /// <summary>
  /// Verifies recipe suggestions survive a serializer round-trip as a populated collection.
  /// </summary>
  [TestMethod]
  public void Invoice_PossibleRecipes_SurviveSerializerRoundTrip()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      PossibleRecipes = [BuildRecipe("Focaccia"), BuildRecipe("Sourdough")],
    };

    // Act
    Invoice roundTripped = RoundTrip(invoice);

    // Assert
    Assert.HasCount(2, roundTripped.PossibleRecipes);

    RecipeSuggestion first = roundTripped.PossibleRecipes.First();
    Assert.AreEqual("Focaccia", first.Name);
    Assert.AreEqual(RecipeDifficulty.Easy, first.Difficulty);
    Assert.HasCount(1, first.PurchasedIngredients, "Nested ingredient records must bind through the constructor.");
    Assert.HasCount(1, first.Steps, "Nested step records must bind through the constructor.");
    Assert.AreEqual(1, first.Steps[0].Sequence);
  }

  #endregion

  #region Product

  /// <summary>
  /// Verifies a product's classification and allergen assessment survive a serializer round-trip.
  /// </summary>
  [TestMethod]
  public void Product_ClassificationAndAllergenAssessment_SurviveSerializerRoundTrip()
  {
    // Arrange
    var product = new Product
    {
      Name = "Wholemeal loaf",
      Classification = ClassificationTestData.Gpc("10000045", "Bread"),
      AllergenAssessment = AllergenAssessment.Detected(
        [
          new AllergenSignal(
            AllergenCode.CerealsContainingGluten,
            AllergenEvidenceLevel.Explicit,
            0.98,
            [new AllergenEvidence("label", "contains wheat")]),
        ]),
    };

    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Items = [product],
    };

    // Act
    Product roundTripped = RoundTrip(invoice).Items.Single();

    // Assert
    Assert.IsNotNull(roundTripped.Classification);
    Assert.AreEqual("10000045", roundTripped.Classification.Code);

    Assert.IsNotNull(roundTripped.AllergenAssessment);
    Assert.HasCount(1, roundTripped.AllergenAssessment.Signals);

    AllergenSignal signal = roundTripped.AllergenAssessment.Signals[0];
    Assert.AreEqual(AllergenCode.CerealsContainingGluten, signal.Code);
    Assert.AreEqual(AllergenEvidenceLevel.Explicit, signal.EvidenceLevel);
    Assert.HasCount(1, signal.Evidence, "Nested allergen evidence must bind through the constructor.");
  }

  #endregion

  #region Merchant

  /// <summary>
  /// Verifies a merchant classification survives a serializer round-trip.
  /// </summary>
  [TestMethod]
  public void Merchant_Classification_SurvivesSerializerRoundTrip()
  {
    // Arrange
    var merchant = new Merchant
    {
      id = Guid.CreateVersion7(),
      Name = "Corner Bakery",
      Classification = ClassificationTestData.Nace("47.24", "Retail sale of bread"),
    };

    // Act
    Merchant roundTripped = RoundTrip(merchant);

    // Assert
    Assert.IsNotNull(roundTripped.Classification);
    Assert.AreEqual("47.24", roundTripped.Classification.Code);
    Assert.AreEqual("Retail sale of bread", roundTripped.Classification.OfficialLabel);
    Assert.HasCount(1, roundTripped.Classification.Hierarchy);
  }

  /// <summary>Verifies the transient classification code never enters Cosmos JSON.</summary>
  [TestMethod]
  public void Invoice_ClassificationCode_IsExcludedFromPersistenceSerialization()
  {
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.NewGuid(),
      ClassificationCode = "01.1",
    };

    string json = JsonConvert.SerializeObject(invoice);
    Invoice roundTripped = JsonConvert.DeserializeObject<Invoice>(json)
      ?? throw new AssertFailedException("Deserializing Invoice produced null.");

    Assert.IsFalse(json.Contains("ClassificationCode", StringComparison.OrdinalIgnoreCase));
    Assert.IsNull(roundTripped.ClassificationCode);
  }

  #endregion

  #region Helpers

  /// <summary>
  /// Round-trips an entity through the serializer the Cosmos SDK uses by default.
  /// </summary>
  private static T RoundTrip<T>(T entity)
  {
    string json = JsonConvert.SerializeObject(entity);
    return JsonConvert.DeserializeObject<T>(json)
      ?? throw new AssertFailedException($"Deserializing {typeof(T).Name} produced null.");
  }

  private static RecipeSuggestion BuildRecipe(string name) =>
    new(
      name,
      $"{name} description.",
      2,
      10,
      20,
      30,
      RecipeDifficulty.Easy,
      [new RecipeIngredient("Flour", "500 g", null)],
      [new RecipeIngredient("Salt", "1 tsp", null)],
      [],
      [new RecipeStep(1, "Mix everything.", null)],
      [],
      Guid.CreateVersion7());

  #endregion
}
