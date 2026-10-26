namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using Microsoft.Extensions.Logging.Abstractions;

using Moq;

/// <summary>
/// Builds <see cref="AnalysisFoundationService"/> instances wired to deterministic capability scripts.
/// </summary>
internal sealed class GenerativeCapabilityHarness
{
  private GenerativeCapabilityHarness(
    ScriptedGenerativeAnalysisBroker broker,
    IReadOnlyList<ProductAnalysisInput> products,
    IReadOnlyDictionary<string, StandardClassification> classifications,
    IReadOnlyDictionary<string, AllergenAssessment> allergens)
  {
    Broker = broker;
    Products = products;
    Classifications = classifications;
    Allergens = allergens;
    Service = new AnalysisFoundationService(
      Mock.Of<IDocumentIntelligenceBroker>(),
      broker,
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance);
  }

  /// <summary>Gets the foundation service under test.</summary>
  public AnalysisFoundationService Service { get; }

  /// <summary>Gets the scripted generative broker backing the service.</summary>
  public ScriptedGenerativeAnalysisBroker Broker { get; }

  /// <summary>Gets the transient products submitted to the service.</summary>
  public IReadOnlyList<ProductAnalysisInput> Products { get; }

  /// <summary>Gets the product classifications paired with <see cref="Products"/>.</summary>
  public IReadOnlyDictionary<string, StandardClassification> Classifications { get; }

  /// <summary>Gets the allergen assessments paired with <see cref="Products"/>.</summary>
  public IReadOnlyDictionary<string, AllergenAssessment> Allergens { get; }

  /// <summary>
  /// Creates a harness scripted for invoice summary generation.
  /// </summary>
  /// <param name="name">The scripted summary name.</param>
  /// <param name="description">The scripted summary description.</param>
  /// <returns>A harness ready for summary generation tests.</returns>
  public static GenerativeCapabilityHarness WithInvoiceSummary(string name, string description)
  {
    var response = new AnalysisFoundationService.InvoiceSummaryStructuredResult(name, description);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      CreateProducts(includeNonFood: false),
      CreateClassifications(includeNonFood: false),
      CreateAllergens());
  }

  /// <summary>
  /// Creates a harness scripted for a single product allergen signal.
  /// </summary>
  /// <param name="code">The allergen code emitted by the scripted provider response.</param>
  /// <param name="evidenceTier">The evidence tier emitted by the scripted provider response.</param>
  /// <param name="evidenceSource">The evidence source emitted by the scripted provider response.</param>
  /// <returns>A harness ready for allergen assessment tests.</returns>
  public static GenerativeCapabilityHarness WithAllergenSignal(
    AllergenCode code,
    ProductAllergenEvidenceTier evidenceTier,
    string evidenceSource)
  {
    var response = new AnalysisFoundationService.AllergenAssessmentBatchStructuredResult(
      [
        new AnalysisFoundationService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "SignalsFound",
          [
            new AnalysisFoundationService.AllergenSignalStructuredEntry(
              code.ToString(),
              evidenceTier.ToString(),
              0.92,
              [
                new AnalysisFoundationService.AllergenEvidenceStructuredEntry(
                  evidenceSource,
                  "lapte")
              ])
          ])
      ]);

    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      CreateProducts(includeNonFood: false),
      CreateClassifications(includeNonFood: false),
      CreateAllergens());
  }

  /// <summary>
  /// Creates a harness scripted for a successful allergen response with no signals.
  /// </summary>
  /// <returns>A harness ready for empty allergen success tests.</returns>
  public static GenerativeCapabilityHarness EmptyAllergenSuccess()
  {
    var response = new AnalysisFoundationService.AllergenAssessmentBatchStructuredResult(
      [
        new AnalysisFoundationService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "NoSignalsInAvailableEvidence",
          [])
      ]);

    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      CreateProducts(includeNonFood: false),
      CreateClassifications(includeNonFood: false),
      CreateAllergens());
  }

  /// <summary>
  /// Creates a harness scripted for recipe generation.
  /// </summary>
  /// <param name="recipes">The scripted recipes returned by the provider.</param>
  /// <returns>A harness ready for recipe generation tests.</returns>
  public static GenerativeCapabilityHarness WithRecipes(
    IReadOnlyList<AnalysisFoundationService.RecipeStructuredSuggestion> recipes)
  {
    var response = new AnalysisFoundationService.RecipeGenerationStructuredResult(recipes);
    var broker = new ScriptedGenerativeAnalysisBroker(ScriptedGenerativeAnalysisBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      CreateProducts(includeNonFood: true),
      CreateClassifications(includeNonFood: true),
      CreateAllergens(
        new Dictionary<string, AllergenAssessment>
        {
          ["item-0001"] = AllergenAssessment.Detected(
            [
              new AllergenSignal(
                AllergenCode.Milk,
                AllergenEvidenceLevel.Explicit,
                0.98,
                [new AllergenEvidence("ingredientsText", "milk")])
            ]),
          ["item-0002"] = AllergenAssessment.NoSignals(),
        }));
  }

  /// <summary>
  /// Creates a harness containing only non-food recipe inputs.
  /// </summary>
  /// <returns>A harness ready for all-non-food recipe generation tests.</returns>
  public static GenerativeCapabilityHarness WithNonFoodOnlyRecipeInputs()
  {
    var broker = new ScriptedGenerativeAnalysisBroker();

    return new GenerativeCapabilityHarness(
      broker,
      [new ProductAnalysisInput("item-0001", new Product { Name = "pensula", Quantity = 1, QuantityUnit = "pcs" })],
      new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
      {
        ["item-0001"] = CreateNonFoodClassification("10001674", "Artists Brushes/Applicators"),
      },
      CreateAllergens(new Dictionary<string, AllergenAssessment>(StringComparer.Ordinal)
      {
        ["item-0001"] = AllergenAssessment.NoSignals(),
      }));
  }

  private static IReadOnlyList<ProductAnalysisInput> CreateProducts(bool includeNonFood) =>
    includeNonFood
      ?
      [
        new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" }),
        new ProductAnalysisInput("item-0002", new Product { Name = "pensula", Quantity = 1, QuantityUnit = "pcs" }),
      ]
      :
      [
        new ProductAnalysisInput("item-0001", new Product { Name = "lapte", Quantity = 1, QuantityUnit = "l" }),
      ];

  private static Dictionary<string, StandardClassification> CreateClassifications(bool includeNonFood)
  {
    var classifications = new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = CreateFoodClassification("10000025", "Milk (Perishable)"),
    };

    if (includeNonFood)
    {
      classifications["item-0002"] = CreateNonFoodClassification("10001674", "Artists Brushes/Applicators");
    }

    return classifications;
  }

  private static IReadOnlyDictionary<string, AllergenAssessment> CreateAllergens(
    IReadOnlyDictionary<string, AllergenAssessment>? assessments = null) =>
      assessments
      ?? new Dictionary<string, AllergenAssessment>(StringComparer.Ordinal)
      {
        ["item-0001"] = AllergenAssessment.NoSignals(),
      };

  private static StandardClassification CreateFoodClassification(string code, string label) =>
    new(
      ClassificationSystem.Gs1Gpc,
      "2026-05",
      code,
      label,
      [
        new ClassificationNode("segment", "50000000", "Food/Beverage"),
        new ClassificationNode("family", "50130000", "Milk/Butter/Cream/Yogurts/Cheese/Eggs/Substitutes"),
        new ClassificationNode("class", "50131700", "Milk/Milk Substitutes"),
        new ClassificationNode("brick", code, label),
      ],
      ClassificationOrigin.Analysis,
      0.91,
      [new ClassificationEvidence("subject.description", "lapte")]);

  private static StandardClassification CreateNonFoodClassification(string code, string label) =>
    new(
      ClassificationSystem.Gs1Gpc,
      "2026-05",
      code,
      label,
      [
        new ClassificationNode("segment", "70000000", "Arts/Crafts/Needlework"),
        new ClassificationNode("family", "70010000", "Arts/Crafts/Needlework Supplies"),
        new ClassificationNode("class", "70010100", "Artists Painting/Drawing Supplies"),
        new ClassificationNode("brick", code, label),
      ],
      ClassificationOrigin.Analysis,
      0.74,
      [new ClassificationEvidence("subject.description", "pensula")]);
}
