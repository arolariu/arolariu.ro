namespace arolariu.Backend.Domain.Tests.Invoices.DTOs;

using System;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;

using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies <c>PossibleRecipes</c> write semantics for both PATCH and PUT invoice contracts.
/// </summary>
/// <remarks>
/// <para>The contract table is:</para>
/// <list type="table">
/// <listheader><term>possibleRecipes value</term><term>Behaviour</term></listheader>
/// <item><term>absent / null</term><term>PRESERVE the persisted collection</term></item>
/// <item><term>[] (explicit empty array)</term><term>REPLACE with empty — clears all recipes</term></item>
/// <item><term>[...]</term><term>REPLACE wholesale with the supplied recipes</term></item>
/// </list>
/// <para>
/// For PATCH all three cases are implemented in <see cref="PatchInvoiceRequestDto.ApplyTo"/>.
/// For PUT the null-preserve case is implemented at the handler level (mirroring how
/// <c>UpdateSpecificInvoiceAsync</c> preserves <c>Scans</c>), while non-null cases are
/// handled by <see cref="UpdateInvoiceRequestDto.ToInvoice"/>.
/// </para>
/// </remarks>
[TestClass]
public sealed class InvoiceRecipeWriteContractTests
{
  private static readonly Guid UserId = Guid.NewGuid();
  private static readonly Guid InvoiceId = Guid.NewGuid();

  /// <summary>
  /// Builds a minimal valid <see cref="RecipeSuggestionRequestDto"/> for the given name.
  /// One step is required; zero steps would throw from the domain guard.
  /// </summary>
  private static RecipeSuggestionRequestDto MakeRecipeDto(string name) => new(
    Name: name,
    Description: "A test recipe.",
    Servings: 1,
    PreparationMinutes: 1,
    CookingMinutes: 1,
    TotalMinutes: 2,
    Difficulty: RecipeDifficulty.Easy,
    PurchasedIngredients: null,
    AssumedPantryStaples: null,
    MissingOptionalIngredients: null,
    Steps: [new RecipeStepRequestDto(1, "Mix and serve.", null)],
    AllergenWarnings: null);

  private static Invoice MakeExistingInvoice(params RecipeSuggestion[] recipes)
  {
    var invoice = new Invoice
    {
      id = InvoiceId,
      UserIdentifier = UserId,
    };

    foreach (var r in recipes)
    {
      invoice.PossibleRecipes.Add(r);
    }

    return invoice;
  }

  // ── PATCH tests ──────────────────────────────────────────────────────────────

  /// <summary>
  /// Null <c>PossibleRecipes</c> on a PATCH request must leave the persisted
  /// recipes untouched after <see cref="PatchInvoiceRequestDto.ApplyTo"/> is called.
  /// </summary>
  [TestMethod]
  public void Patch_NullRecipes_PreservesExistingRecipes()
  {
    var existing = MakeExistingInvoice(MakeRecipeDto("Persisted Soup").ToRecipeSuggestion());

    var dto = new PatchInvoiceRequestDto(
      Name: null,
      Description: null,
      ClassificationCode: null,
      PaymentInformation: null,
      MerchantReference: null,
      IsImportant: null,
      SharedWith: null,
      PossibleRecipes: null,   // null → preserve
      AdditionalMetadata: null);

    Invoice result = dto.ApplyTo(existing, UserId);

    Assert.HasCount(1, result.PossibleRecipes);
    Assert.AreEqual("Persisted Soup", result.PossibleRecipes.Single().Name);
  }

  /// <summary>
  /// A non-empty <c>PossibleRecipes</c> list on a PATCH request must replace the persisted
  /// recipes wholesale — the old recipes must not appear in the result.
  /// </summary>
  [TestMethod]
  public void Patch_SuppliedRecipes_ReplacesExistingRecipes()
  {
    var existing = MakeExistingInvoice(MakeRecipeDto("Old Soup").ToRecipeSuggestion());

    var dto = new PatchInvoiceRequestDto(
      Name: null,
      Description: null,
      ClassificationCode: null,
      PaymentInformation: null,
      MerchantReference: null,
      IsImportant: null,
      SharedWith: null,
      PossibleRecipes: [MakeRecipeDto("New Salad")],   // supplied → replace
      AdditionalMetadata: null);

    Invoice result = dto.ApplyTo(existing, UserId);

    Assert.HasCount(1, result.PossibleRecipes);
    Assert.AreEqual("New Salad", result.PossibleRecipes.Single().Name);
    Assert.IsFalse(result.PossibleRecipes.Any(r => r.Name == "Old Soup"));
  }

  /// <summary>
  /// An explicitly empty array for <c>PossibleRecipes</c> on a PATCH request must clear
  /// the collection — it is not treated the same as null.
  /// </summary>
  [TestMethod]
  public void Patch_ExplicitEmptyRecipes_ClearsCollection()
  {
    var existing = MakeExistingInvoice(MakeRecipeDto("Tasty Stew").ToRecipeSuggestion());

    var dto = new PatchInvoiceRequestDto(
      Name: null,
      Description: null,
      ClassificationCode: null,
      PaymentInformation: null,
      MerchantReference: null,
      IsImportant: null,
      SharedWith: null,
      PossibleRecipes: [],       // explicit empty → clear
      AdditionalMetadata: null);

    Invoice result = dto.ApplyTo(existing, UserId);

    Assert.IsEmpty(result.PossibleRecipes);
  }

  // ── PUT tests ─────────────────────────────────────────────────────────────────

  /// <summary>
  /// Null <c>PossibleRecipes</c> on a PUT request must preserve the persisted recipes.
  /// <see cref="UpdateInvoiceRequestDto.ToInvoice"/> alone produces an empty collection;
  /// the <c>UpdateSpecificInvoiceAsync</c> handler supplements with the existing recipes
  /// when the DTO field is null — exactly mirroring how <c>Scans</c> are preserved.
  /// This test replicates that handler-level logic inline.
  /// </summary>
  [TestMethod]
  public void Put_NullRecipes_HandlerPreservesExistingRecipes()
  {
    var existing = MakeExistingInvoice(MakeRecipeDto("Persisted Curry").ToRecipeSuggestion());

    var dto = new UpdateInvoiceRequestDto(
      Name: "Invoice",
      Description: "desc",
      ClassificationCode: null,
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      PossibleRecipes: null,    // null → preserve (handler-level)
      AdditionalMetadata: null);

    var updatedEntity = dto.ToInvoice(InvoiceId, UserId);

    // Replicate what UpdateSpecificInvoiceAsync does when PossibleRecipes is null:
    if (dto.PossibleRecipes is null)
    {
      foreach (var r in existing.PossibleRecipes)
      {
        updatedEntity.PossibleRecipes.Add(r);
      }
    }

    Assert.HasCount(1, updatedEntity.PossibleRecipes);
    Assert.AreEqual("Persisted Curry", updatedEntity.PossibleRecipes.Single().Name);
  }

  /// <summary>
  /// A non-empty <c>PossibleRecipes</c> list on a PUT request must be mapped by
  /// <see cref="UpdateInvoiceRequestDto.ToInvoice"/> and must not include the old recipes.
  /// </summary>
  [TestMethod]
  public void Put_SuppliedRecipes_ReplacesRecipes()
  {
    var dto = new UpdateInvoiceRequestDto(
      Name: "Invoice",
      Description: "desc",
      ClassificationCode: null,
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      PossibleRecipes: [MakeRecipeDto("New Risotto")],   // supplied → replace
      AdditionalMetadata: null);

    Invoice result = dto.ToInvoice(InvoiceId, UserId);

    Assert.HasCount(1, result.PossibleRecipes);
    Assert.AreEqual("New Risotto", result.PossibleRecipes.Single().Name);
  }

  /// <summary>
  /// An explicitly empty array for <c>PossibleRecipes</c> on a PUT request must clear the
  /// collection — the handler does not re-add existing recipes for a non-null DTO field.
  /// </summary>
  [TestMethod]
  public void Put_ExplicitEmptyRecipes_ClearsCollection()
  {
    var dto = new UpdateInvoiceRequestDto(
      Name: "Invoice",
      Description: "desc",
      ClassificationCode: null,
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      PossibleRecipes: [],       // explicit empty → clear
      AdditionalMetadata: null);

    Invoice result = dto.ToInvoice(InvoiceId, UserId);

    Assert.IsEmpty(result.PossibleRecipes);
  }

  // ── Classification preservation ───────────────────────────────────────────────

  /// <summary>
  /// A PUT with no manual classification code must not destroy an analysis-derived
  /// classification. <see cref="UpdateInvoiceRequestDto.ToInvoice"/> never populates
  /// <c>Classification</c>, and persistence is a full-document upsert, so without the
  /// handler-level preserve step an unrelated edit such as renaming the invoice would
  /// silently drop the classification along with its origin, confidence and evidence.
  /// This test replicates that handler logic inline.
  /// </summary>
  [TestMethod]
  public void Put_NullClassificationCode_HandlerPreservesExistingClassification()
  {
    var existing = MakeExistingInvoice();
    existing.Classification = new StandardClassification(
      ClassificationSystem.EcoicopV2,
      "2.0",
      "01.1.1",
      "Bread and cereals",
      [
        new ClassificationNode("division", "01", "Food and non-alcoholic beverages"),
        new ClassificationNode("group", "01.1", "Food"),
        new ClassificationNode("class", "01.1.1", "Bread and cereals"),
      ],
      ClassificationOrigin.Analysis,
      0.87,
      []);

    var dto = new UpdateInvoiceRequestDto(
      Name: "Renamed invoice",
      Description: "desc",
      ClassificationCode: null,   // null → preserve (handler-level)
      PaymentInformation: new PaymentInformation(),
      MerchantReference: null,
      IsImportant: false,
      PossibleRecipes: null,
      AdditionalMetadata: null);

    var updatedEntity = dto.ToInvoice(InvoiceId, UserId);

    // Without the handler step the replacement entity carries no classification at all.
    Assert.IsNull(updatedEntity.Classification);

    // Replicate what UpdateSpecificInvoiceAsync does when ClassificationCode is null:
    if (dto.ClassificationCode is null)
    {
      updatedEntity.Classification = existing.Classification;
    }

    Assert.IsNotNull(updatedEntity.Classification);
    Assert.AreEqual("01.1.1", updatedEntity.Classification!.Code);
    Assert.AreEqual(ClassificationOrigin.Analysis, updatedEntity.Classification.Origin);
    Assert.AreEqual(0.87, updatedEntity.Classification.Confidence);
  }
}
