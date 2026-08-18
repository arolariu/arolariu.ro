namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;

/// <summary>
/// Represents the canonical transport projection of a standard classification.
/// </summary>
/// <remarks>
/// <para>
/// This immutable DTO exposes the label, hierarchy, provenance, confidence, and evidence required to render a
/// classification without exposing taxonomy artifacts or analysis-run persistence.
/// </para>
/// <para>
/// Collections are materialized as read-only snapshots so later aggregate mutation cannot change a response that
/// has already been projected.
/// </para>
/// </remarks>
/// <param name="System">The canonical taxonomy system.</param>
/// <param name="Version">The taxonomy artifact version that resolved the classification.</param>
/// <param name="Code">The canonical code selected from the taxonomy.</param>
/// <param name="OfficialLabel">The official label assigned to <paramref name="Code"/>.</param>
/// <param name="Hierarchy">The hierarchy path ending at <paramref name="Code"/>.</param>
/// <param name="Origin">Whether a user or analysis selected the classification.</param>
/// <param name="Confidence">The advisory analysis confidence, or null for a manual selection.</param>
/// <param name="Evidence">The evidence items that explain the selection.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct StandardClassificationResponseDto(
  [property: JsonPropertyName("system")] ClassificationSystem System,
  [property: JsonPropertyName("version")] string Version,
  [property: JsonPropertyName("code")] string Code,
  [property: JsonPropertyName("officialLabel")] string OfficialLabel,
  [property: JsonPropertyName("hierarchy")] IReadOnlyList<ClassificationNodeResponseDto> Hierarchy,
  [property: JsonPropertyName("origin")] ClassificationOrigin Origin,
  [property: JsonPropertyName("confidence")] double? Confidence,
  [property: JsonPropertyName("evidence")] IReadOnlyList<ClassificationEvidenceResponseDto> Evidence)
{
  /// <summary>
  /// Projects an optional domain classification into its public transport representation.
  /// </summary>
  /// <param name="classification">The canonical classification to project, or null when it is not assigned.</param>
  /// <returns>A complete immutable classification response, or null when <paramref name="classification"/> is null.</returns>
  public static StandardClassificationResponseDto? FromStandardClassification(StandardClassification? classification) =>
    classification is null
      ? null
      : new(
        System: classification.System,
        Version: classification.Version,
        Code: classification.Code,
        OfficialLabel: classification.OfficialLabel,
        Hierarchy: classification.Hierarchy
          .Select(ClassificationNodeResponseDto.FromClassificationNode)
          .ToList()
          .AsReadOnly(),
        Origin: classification.Origin,
        Confidence: classification.Confidence,
        Evidence: classification.Evidence
          .Select(ClassificationEvidenceResponseDto.FromClassificationEvidence)
          .ToList()
          .AsReadOnly());
}

/// <summary>
/// Represents one official node in a classification hierarchy response.
/// </summary>
/// <param name="Level">The taxonomy level represented by the node.</param>
/// <param name="Code">The canonical code at this hierarchy level.</param>
/// <param name="OfficialLabel">The official taxonomy label for the node.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ClassificationNodeResponseDto(
  [property: JsonPropertyName("level")] string Level,
  [property: JsonPropertyName("code")] string Code,
  [property: JsonPropertyName("officialLabel")] string OfficialLabel)
{
  /// <summary>
  /// Projects a canonical hierarchy node into its public transport representation.
  /// </summary>
  /// <param name="node">The canonical hierarchy node to project.</param>
  /// <returns>An immutable hierarchy-node response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="node"/> is null.</exception>
  public static ClassificationNodeResponseDto FromClassificationNode(ClassificationNode node)
  {
    ArgumentNullException.ThrowIfNull(node);
    return new(node.Level, node.Code, node.OfficialLabel);
  }
}

/// <summary>
/// Represents one evidence item that explains a classification response.
/// </summary>
/// <param name="Source">The stable source key for the evidence.</param>
/// <param name="Value">The evidence value available for UI explanation.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ClassificationEvidenceResponseDto(
  [property: JsonPropertyName("source")] string Source,
  [property: JsonPropertyName("value")] string Value)
{
  /// <summary>
  /// Projects a classification evidence item into its public transport representation.
  /// </summary>
  /// <param name="evidence">The classification evidence item to project.</param>
  /// <returns>An immutable classification-evidence response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="evidence"/> is null.</exception>
  public static ClassificationEvidenceResponseDto FromClassificationEvidence(ClassificationEvidence evidence)
  {
    ArgumentNullException.ThrowIfNull(evidence);
    return new(evidence.Source, evidence.Value);
  }
}

/// <summary>
/// Represents the public outcome of a product allergen assessment.
/// </summary>
/// <remarks>
/// The transport shape deliberately omits the internal source-run identifier. A non-null assessment means the
/// capability produced an outcome; consumers must use <see cref="Status"/> rather than infer safety from an empty
/// signal collection.
/// </remarks>
/// <param name="Status">The outcome of the structured allergen assessment.</param>
/// <param name="Signals">The detected allergen signals; empty for non-detected outcomes.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AllergenAssessmentResponseDto(
  [property: JsonPropertyName("status")] AllergenAssessmentStatus Status,
  [property: JsonPropertyName("signals")] IReadOnlyList<AllergenSignalResponseDto> Signals)
{
  /// <summary>
  /// Projects an optional allergen assessment into its public transport representation.
  /// </summary>
  /// <param name="assessment">The domain assessment to project, or null when no assessment was produced.</param>
  /// <returns>A read-only assessment response, or null when <paramref name="assessment"/> is null.</returns>
  public static AllergenAssessmentResponseDto? FromAllergenAssessment(AllergenAssessment? assessment) =>
    assessment is null
      ? null
      : new(
        Status: assessment.Status,
        Signals: assessment.Signals
          .Select(AllergenSignalResponseDto.FromAllergenSignal)
          .ToList()
          .AsReadOnly());
}

/// <summary>
/// Represents one detected allergen and the evidence supporting it.
/// </summary>
/// <param name="Code">The canonical EU-14 allergen code.</param>
/// <param name="EvidenceLevel">The strength of the supporting evidence.</param>
/// <param name="Confidence">The advisory confidence in the signal.</param>
/// <param name="Evidence">The evidence fragments supporting the signal.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AllergenSignalResponseDto(
  [property: JsonPropertyName("code")] AllergenCode Code,
  [property: JsonPropertyName("evidenceLevel")] AllergenEvidenceLevel EvidenceLevel,
  [property: JsonPropertyName("confidence")] double Confidence,
  [property: JsonPropertyName("evidence")] IReadOnlyList<AllergenEvidenceResponseDto> Evidence)
{
  /// <summary>
  /// Projects an allergen signal into its public transport representation.
  /// </summary>
  /// <param name="signal">The allergen signal to project.</param>
  /// <returns>An immutable allergen-signal response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="signal"/> is null.</exception>
  public static AllergenSignalResponseDto FromAllergenSignal(AllergenSignal signal)
  {
    ArgumentNullException.ThrowIfNull(signal);
    return new(
      Code: signal.Code,
      EvidenceLevel: signal.EvidenceLevel,
      Confidence: signal.Confidence,
      Evidence: signal.Evidence
        .Select(AllergenEvidenceResponseDto.FromAllergenEvidence)
        .ToList()
        .AsReadOnly());
  }
}

/// <summary>
/// Represents one evidence fragment used to explain an allergen signal.
/// </summary>
/// <param name="Source">The stable source key for the evidence.</param>
/// <param name="Value">The evidence value available for UI explanation.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct AllergenEvidenceResponseDto(
  [property: JsonPropertyName("source")] string Source,
  [property: JsonPropertyName("value")] string Value)
{
  /// <summary>
  /// Projects an allergen evidence fragment into its public transport representation.
  /// </summary>
  /// <param name="evidence">The allergen evidence fragment to project.</param>
  /// <returns>An immutable allergen-evidence response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="evidence"/> is null.</exception>
  public static AllergenEvidenceResponseDto FromAllergenEvidence(AllergenEvidence evidence)
  {
    ArgumentNullException.ThrowIfNull(evidence);
    return new(evidence.Source, evidence.Value);
  }
}

/// <summary>
/// Represents a structured recipe suggestion available for an invoice.
/// </summary>
/// <remarks>
/// This public projection includes only rendering data. It intentionally excludes the internal analysis-run
/// identifier while retaining structured ingredient groups, ordered steps, and allergen warnings.
/// </remarks>
/// <param name="Name">The recipe display name.</param>
/// <param name="Description">The recipe summary.</param>
/// <param name="Servings">The number of servings produced by the recipe.</param>
/// <param name="PreparationMinutes">The estimated preparation time in minutes.</param>
/// <param name="CookingMinutes">The estimated cooking time in minutes.</param>
/// <param name="TotalMinutes">The estimated total elapsed time in minutes.</param>
/// <param name="Difficulty">The recipe preparation difficulty.</param>
/// <param name="PurchasedIngredients">Ingredients fulfilled by purchased products.</param>
/// <param name="AssumedPantryStaples">Ingredients assumed to be pantry staples.</param>
/// <param name="MissingOptionalIngredients">Optional ingredients not present on the invoice.</param>
/// <param name="Steps">Ordered actionable recipe steps.</param>
/// <param name="AllergenWarnings">EU-14 allergen warnings relevant to the recipe.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeSuggestionResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("description")] string Description,
  [property: JsonPropertyName("servings")] int Servings,
  [property: JsonPropertyName("preparationMinutes")] int PreparationMinutes,
  [property: JsonPropertyName("cookingMinutes")] int CookingMinutes,
  [property: JsonPropertyName("totalMinutes")] int TotalMinutes,
  [property: JsonPropertyName("difficulty")] RecipeDifficulty Difficulty,
  [property: JsonPropertyName("purchasedIngredients")] IReadOnlyList<RecipeIngredientResponseDto> PurchasedIngredients,
  [property: JsonPropertyName("assumedPantryStaples")] IReadOnlyList<RecipeIngredientResponseDto> AssumedPantryStaples,
  [property: JsonPropertyName("missingOptionalIngredients")] IReadOnlyList<RecipeIngredientResponseDto> MissingOptionalIngredients,
  [property: JsonPropertyName("steps")] IReadOnlyList<RecipeStepResponseDto> Steps,
  [property: JsonPropertyName("allergenWarnings")] IReadOnlyList<AllergenCode> AllergenWarnings)
{
  /// <summary>
  /// Projects a recipe suggestion into its public transport representation.
  /// </summary>
  /// <param name="recipe">The recipe suggestion to project.</param>
  /// <returns>An immutable structured recipe response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="recipe"/> is null.</exception>
  public static RecipeSuggestionResponseDto FromRecipeSuggestion(RecipeSuggestion recipe)
  {
    ArgumentNullException.ThrowIfNull(recipe);
    return new(
      Name: recipe.Name,
      Description: recipe.Description,
      Servings: recipe.Servings,
      PreparationMinutes: recipe.PreparationMinutes,
      CookingMinutes: recipe.CookingMinutes,
      TotalMinutes: recipe.TotalMinutes,
      Difficulty: recipe.Difficulty,
      PurchasedIngredients: recipe.PurchasedIngredients
        .Select(RecipeIngredientResponseDto.FromRecipeIngredient)
        .ToList()
        .AsReadOnly(),
      AssumedPantryStaples: recipe.AssumedPantryStaples
        .Select(RecipeIngredientResponseDto.FromRecipeIngredient)
        .ToList()
        .AsReadOnly(),
      MissingOptionalIngredients: recipe.MissingOptionalIngredients
        .Select(RecipeIngredientResponseDto.FromRecipeIngredient)
        .ToList()
        .AsReadOnly(),
      Steps: recipe.Steps
        .Select(RecipeStepResponseDto.FromRecipeStep)
        .ToList()
        .AsReadOnly(),
      AllergenWarnings: recipe.AllergenWarnings.ToList().AsReadOnly());
  }
}

/// <summary>
/// Represents one structured ingredient in a recipe suggestion.
/// </summary>
/// <param name="Name">The ingredient display name.</param>
/// <param name="Quantity">The ingredient quantity expression.</param>
/// <param name="Preparation">Optional ingredient preparation guidance.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct RecipeIngredientResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("quantity")] string Quantity,
  [property: JsonPropertyName("preparation")] string? Preparation)
{
  /// <summary>
  /// Projects a recipe ingredient into its public transport representation.
  /// </summary>
  /// <param name="ingredient">The recipe ingredient to project.</param>
  /// <returns>An immutable recipe-ingredient response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="ingredient"/> is null.</exception>
  public static RecipeIngredientResponseDto FromRecipeIngredient(RecipeIngredient ingredient)
  {
    ArgumentNullException.ThrowIfNull(ingredient);
    return new(ingredient.Name, ingredient.Quantity, ingredient.Preparation);
  }
}

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

/// <summary>
/// Represents the public payment information associated with an invoice.
/// </summary>
/// <param name="TransactionDate">The transaction time supplied by the receipt.</param>
/// <param name="PaymentType">The extracted payment type.</param>
/// <param name="Currency">The currency in which all amounts are expressed.</param>
/// <param name="TotalCostAmount">The gross total amount including tax.</param>
/// <param name="TotalTaxAmount">The total tax component of the transaction.</param>
/// <param name="SubtotalAmount">The pre-tax subtotal, or zero when unavailable.</param>
/// <param name="TipAmount">The gratuity amount, or zero when unavailable.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PaymentInformationResponseDto(
  [property: JsonPropertyName("transactionDate")] DateTimeOffset TransactionDate,
  [property: JsonPropertyName("paymentType")] PaymentType PaymentType,
  [property: JsonPropertyName("currency")] CurrencyResponseDto Currency,
  [property: JsonPropertyName("totalCostAmount")] decimal TotalCostAmount,
  [property: JsonPropertyName("totalTaxAmount")] decimal TotalTaxAmount,
  [property: JsonPropertyName("subtotalAmount")] decimal SubtotalAmount,
  [property: JsonPropertyName("tipAmount")] decimal TipAmount)
{
  /// <summary>
  /// Projects payment information into its public transport representation.
  /// </summary>
  /// <param name="paymentInformation">The payment information to project.</param>
  /// <returns>An immutable payment-information response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="paymentInformation"/> is null.</exception>
  public static PaymentInformationResponseDto FromPaymentInformation(PaymentInformation paymentInformation)
  {
    ArgumentNullException.ThrowIfNull(paymentInformation);
    return new(
      TransactionDate: paymentInformation.TransactionDate,
      PaymentType: paymentInformation.PaymentType,
      Currency: CurrencyResponseDto.FromCurrency(paymentInformation.Currency),
      TotalCostAmount: paymentInformation.TotalCostAmount,
      TotalTaxAmount: paymentInformation.TotalTaxAmount,
      SubtotalAmount: paymentInformation.SubtotalAmount,
      TipAmount: paymentInformation.TipAmount);
  }
}

/// <summary>
/// Represents the public currency details associated with a payment.
/// </summary>
/// <param name="Name">The currency display name.</param>
/// <param name="Code">The stable currency code.</param>
/// <param name="Symbol">The currency display symbol.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct CurrencyResponseDto(
  [property: JsonPropertyName("name")] string Name,
  [property: JsonPropertyName("code")] string Code,
  [property: JsonPropertyName("symbol")] string Symbol)
{
  /// <summary>
  /// Projects a currency value object into its public transport representation.
  /// </summary>
  /// <param name="currency">The currency value object to project.</param>
  /// <returns>An immutable currency response.</returns>
  public static CurrencyResponseDto FromCurrency(Currency currency) =>
    new(currency.Name, currency.Code, currency.Symbol);
}

/// <summary>
/// Represents one detailed tax line extracted from an invoice receipt.
/// </summary>
/// <param name="Amount">The tax amount for the line.</param>
/// <param name="Rate">The tax rate percentage for the line.</param>
/// <param name="NetAmount">The net amount before tax for the line.</param>
/// <param name="Description">The tax description supplied by the receipt.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct TaxDetailResponseDto(
  [property: JsonPropertyName("amount")] decimal Amount,
  [property: JsonPropertyName("rate")] decimal Rate,
  [property: JsonPropertyName("netAmount")] decimal NetAmount,
  [property: JsonPropertyName("description")] string Description)
{
  /// <summary>
  /// Projects a tax detail into its public transport representation.
  /// </summary>
  /// <param name="taxDetail">The tax detail to project.</param>
  /// <returns>An immutable tax-detail response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="taxDetail"/> is null.</exception>
  public static TaxDetailResponseDto FromTaxDetail(TaxDetail taxDetail)
  {
    ArgumentNullException.ThrowIfNull(taxDetail);
    return new(taxDetail.Amount, taxDetail.Rate, taxDetail.NetAmount, taxDetail.Description);
  }
}

/// <summary>
/// Represents one payment record extracted from an invoice receipt.
/// </summary>
/// <param name="Method">The receipt-provided payment-method label.</param>
/// <param name="Amount">The amount settled using the payment method.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PaymentDetailResponseDto(
  [property: JsonPropertyName("method")] string Method,
  [property: JsonPropertyName("amount")] decimal Amount)
{
  /// <summary>
  /// Projects a payment detail into its public transport representation.
  /// </summary>
  /// <param name="paymentDetail">The payment detail to project.</param>
  /// <returns>An immutable payment-detail response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="paymentDetail"/> is null.</exception>
  public static PaymentDetailResponseDto FromPaymentDetail(PaymentDetail paymentDetail)
  {
    ArgumentNullException.ThrowIfNull(paymentDetail);
    return new(paymentDetail.Method, paymentDetail.Amount);
  }
}

/// <summary>
/// Represents merchant contact information in the public response contract.
/// </summary>
/// <param name="FullName">The merchant's full legal or display name.</param>
/// <param name="Address">The merchant's postal address.</param>
/// <param name="PhoneNumber">The merchant's contact telephone number.</param>
/// <param name="EmailAddress">The merchant's contact email address.</param>
/// <param name="Website">The merchant's public website address.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ContactInformationResponseDto(
  [property: JsonPropertyName("fullName")] string FullName,
  [property: JsonPropertyName("address")] string Address,
  [property: JsonPropertyName("phoneNumber")] string PhoneNumber,
  [property: JsonPropertyName("emailAddress")] string EmailAddress,
  [property: JsonPropertyName("website")] string Website)
{
  /// <summary>
  /// Projects merchant contact information into its public transport representation.
  /// </summary>
  /// <param name="contactInformation">The contact information to project.</param>
  /// <returns>An immutable contact-information response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="contactInformation"/> is null.</exception>
  public static ContactInformationResponseDto FromContactInformation(ContactInformation contactInformation)
  {
    ArgumentNullException.ThrowIfNull(contactInformation);
    return new(
      contactInformation.FullName,
      contactInformation.Address,
      contactInformation.PhoneNumber,
      contactInformation.EmailAddress,
      contactInformation.Website);
  }
}
