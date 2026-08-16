namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using Microsoft.Extensions.Logging.Abstractions;

/// <summary>
/// Builds <see cref="GenerativeAnalysisFoundationService"/> instances wired to deterministic capability scripts.
/// </summary>
internal sealed class GenerativeCapabilityHarness
{
  private GenerativeCapabilityHarness(
    ScriptedGenerativeAiBroker broker,
    ITaxonomyBroker taxonomyBroker,
    IReadOnlyList<ProductAnalysisInput> products,
    ProductClassificationResult classifications,
    ProductAllergenAssessmentResult allergens)
  {
    Broker = broker;
    TaxonomyBroker = taxonomyBroker;
    Products = products;
    Classifications = classifications;
    Allergens = allergens;
    Service = new GenerativeAnalysisFoundationService(broker, taxonomyBroker, NullLoggerFactory.Instance);
  }

  /// <summary>Gets the foundation service under test.</summary>
  public GenerativeAnalysisFoundationService Service { get; }

  /// <summary>Gets the scripted generative broker backing the service.</summary>
  public ScriptedGenerativeAiBroker Broker { get; }

  /// <summary>Gets the taxonomy broker supplied to the service.</summary>
  public ITaxonomyBroker TaxonomyBroker { get; }

  /// <summary>Gets the transient products submitted to the service.</summary>
  public IReadOnlyList<ProductAnalysisInput> Products { get; }

  /// <summary>Gets the product classifications paired with <see cref="Products"/>.</summary>
  public ProductClassificationResult Classifications { get; }

  /// <summary>Gets the allergen assessments paired with <see cref="Products"/>.</summary>
  public ProductAllergenAssessmentResult Allergens { get; }

  /// <summary>
  /// Creates a harness scripted for invoice summary generation.
  /// </summary>
  /// <param name="name">The scripted summary name.</param>
  /// <param name="description">The scripted summary description.</param>
  /// <returns>A harness ready for summary generation tests.</returns>
  public static GenerativeCapabilityHarness WithInvoiceSummary(string name, string description)
  {
    var response = new GenerativeAnalysisFoundationService.InvoiceSummaryStructuredResult(name, description);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      TaxonomyBrokerTestFactory.Create(),
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
    var response = new GenerativeAnalysisFoundationService.AllergenAssessmentBatchStructuredResult(
      [
        new GenerativeAnalysisFoundationService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "SignalsFound",
          [
            new GenerativeAnalysisFoundationService.AllergenSignalStructuredEntry(
              code.ToString(),
              evidenceTier.ToString(),
              0.92,
              [
                new GenerativeAnalysisFoundationService.AllergenEvidenceStructuredEntry(
                  evidenceSource,
                  "lapte")
              ])
          ])
      ]);

    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      TaxonomyBrokerTestFactory.Create(),
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
    var response = new GenerativeAnalysisFoundationService.AllergenAssessmentBatchStructuredResult(
      [
        new GenerativeAnalysisFoundationService.AllergenAssessmentStructuredEntry(
          "item-0001",
          "NoSignalsInAvailableEvidence",
          [])
      ]);

    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      TaxonomyBrokerTestFactory.Create(),
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
    IReadOnlyList<GenerativeAnalysisFoundationService.RecipeStructuredSuggestion> recipes)
  {
    var response = new GenerativeAnalysisFoundationService.RecipeGenerationStructuredResult(recipes);
    var broker = new ScriptedGenerativeAiBroker(ScriptedGenerativeAiBroker.Success(response));

    return new GenerativeCapabilityHarness(
      broker,
      TaxonomyBrokerTestFactory.Create(),
      CreateProducts(includeNonFood: true),
      CreateClassifications(includeNonFood: true),
      CreateAllergens(
        new Dictionary<string, ProductAllergenAssessment>
        {
          ["item-0001"] = ProductAllergenAssessment.SignalsFound(
            [
              new ProductAllergenSignal(
                AllergenCode.Milk,
                ProductAllergenEvidenceTier.Declared,
                0.98,
                [new AllergenEvidence("ingredientsText", "milk")])
            ]),
          ["item-0002"] = ProductAllergenAssessment.NoSignalsInAvailableEvidence(),
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

  private static ProductClassificationResult CreateClassifications(bool includeNonFood)
  {
    var classifications = new Dictionary<string, StandardClassification>(StringComparer.Ordinal)
    {
      ["item-0001"] = CreateFoodClassification("10000025", "Milk (Perishable)"),
    };

    if (includeNonFood)
    {
      classifications["item-0002"] = CreateNonFoodClassification("10001674", "Artists Brushes/Applicators");
    }

    return new ProductClassificationResult(classifications);
  }

  private static ProductAllergenAssessmentResult CreateAllergens(
    IReadOnlyDictionary<string, ProductAllergenAssessment>? assessments = null) =>
    new(
      assessments
      ?? new Dictionary<string, ProductAllergenAssessment>(StringComparer.Ordinal)
      {
        ["item-0001"] = ProductAllergenAssessment.NoSignalsInAvailableEvidence(),
      });

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
