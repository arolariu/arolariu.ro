namespace arolariu.Backend.Domain.Tests.Invoices.Brokers;

using System;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Tests.Builders;

using Microsoft.VisualStudio.TestTools.UnitTesting;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

/// <summary>
/// Guards the persistence round-trip of the analysis value objects introduced by the analysis cutover.
/// </summary>
/// <remarks>
/// <para><b>Why this suite exists:</b> <c>CosmosDatabaseBroker</c> performs every read and write through the raw
/// <c>CosmosClient</c> container APIs, so the entities are serialized by the Cosmos SDK's own serializer rather than
/// by Entity Framework. The <c>OnModelCreating</c> value-converter configuration therefore never participates in a
/// production round-trip, and asserting on it would prove nothing about real behaviour.</para>
/// <para>Categories use numeric IDs on disk, while recipe and allergen records expose get-only members
/// and validate their invariants at construction. Both must survive the SDK's JSON round trip.</para>
/// </remarks>
[TestClass]
public sealed class AnalysisPersistenceSerializationTests
{
  #region Invoice

  /// <summary>
  /// Verifies a receipt category survives a serializer round-trip as a numeric ID.
  /// </summary>
  [TestMethod]
  public void Invoice_Category_SurvivesSerializerRoundTrip()
  {
    // Arrange
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.CreateVersion7(),
      Category = InvoiceCategory.Groceries,
    };

    // Act
    Invoice roundTripped = RoundTrip(invoice);

    // Assert
    Assert.AreEqual(InvoiceCategory.Groceries, roundTripped.Category);
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
  /// Verifies a product's category and allergen assessment survive a serializer round-trip.
  /// </summary>
  [TestMethod]
  public void Product_CategoryAndAllergenAssessment_SurviveSerializerRoundTrip()
  {
    // Arrange
    var product = new Product
    {
      Name = "Wholemeal loaf",
      Category = ProductCategory.Bread,
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
    Assert.AreEqual(ProductCategory.Bread, roundTripped.Category);

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
  /// Verifies a merchant category survives a serializer round-trip.
  /// </summary>
  [TestMethod]
  public void Merchant_Category_SurvivesSerializerRoundTrip()
  {
    // Arrange
    var merchant = new Merchant
    {
      id = Guid.CreateVersion7(),
      Name = "Corner Bakery",
      Category = MerchantCategory.Bakery,
    };

    // Act
    Merchant roundTripped = RoundTrip(merchant);

    // Assert
    Assert.AreEqual(MerchantCategory.Bakery, roundTripped.Category);
  }

  /// <summary>Verifies an uncategorized invoice is written with a null category.</summary>
  [TestMethod]
  public void Invoice_Uncategorized_RoundTripsNull()
  {
    var invoice = new Invoice
    {
      id = Guid.CreateVersion7(),
      UserIdentifier = Guid.NewGuid(),
    };

    string json = JsonConvert.SerializeObject(invoice);
    Invoice roundTripped = JsonConvert.DeserializeObject<Invoice>(json)
      ?? throw new AssertFailedException("Deserializing Invoice produced null.");

    Assert.IsFalse(json.Contains("ClassificationCode", StringComparison.OrdinalIgnoreCase));
    Assert.AreEqual(JTokenType.Null, JObject.Parse(json)["Category"]?.Type);
    Assert.IsNull(roundTripped.Category);
  }

  #endregion

  /// <summary>Rejects category tokens that the default enum deserializer would otherwise coerce.</summary>
  [TestMethod]
  [DataRow("\"1001\"", "\"2001\"", "\"3001\"")]
  [DataRow("\"FreshFruit\"", "\"Supermarket\"", "\"Groceries\"")]
  [DataRow("2001", "3001", "1001")]
  [DataRow("1001.0", "2001.0", "3001.0")]
  [DataRow("0", "0", "0")]
  [DataRow("99999999999999999999999999", "99999999999999999999999999", "99999999999999999999999999")]
  public void Category_InvalidStoredToken_IsRejected(string product, string merchant, string invoice)
  {
    Assert.ThrowsExactly<JsonSerializationException>(() =>
      JsonConvert.DeserializeObject<Invoice>($$"""{"Items":[{"Name":"Milk","Category":{{product}}}]}"""));
    Assert.ThrowsExactly<JsonSerializationException>(() =>
      JsonConvert.DeserializeObject<Merchant>($$"""{"Category":{{merchant}}}"""));
    Assert.ThrowsExactly<JsonSerializationException>(() =>
      JsonConvert.DeserializeObject<Invoice>($$"""{"Category":{{invoice}}}"""));
  }

  /// <summary>Stored values retain the existing property casing and numeric/null token kinds.</summary>
  [TestMethod]
  public void Category_PersistedValues_AreNumericOrNull()
  {
    var invoice = new Invoice
    {
      id = Guid.NewGuid(),
      UserIdentifier = Guid.NewGuid(),
      Category = InvoiceCategory.Other,
      Items = [new Product { Category = ProductCategory.Milk }, new Product()],
    };
    var merchant = new Merchant { Category = MerchantCategory.Supermarket };
    var invoiceJson = JObject.Parse(JsonConvert.SerializeObject(invoice));
    var merchantJson = JObject.Parse(JsonConvert.SerializeObject(merchant));
    var products = (JArray?)invoiceJson["Items"];
    Assert.IsNotNull(products);
    Assert.AreEqual(JTokenType.Integer, invoiceJson["Category"]?.Type);
    Assert.AreEqual(JTokenType.Integer, products[0]["Category"]?.Type);
    Assert.AreEqual(JTokenType.Null, products[1]["Category"]?.Type);
    Assert.AreEqual(JTokenType.Integer, merchantJson["Category"]?.Type);
  }

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
      []);

  #endregion
}
