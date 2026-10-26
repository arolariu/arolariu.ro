namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Defines the bounded, immutable telemetry identity for one generative analysis capability.
/// </summary>
/// <remarks>
/// <para>These identifiers intentionally describe the deployed prompt and structured-output contract, not source
/// type names or prompt text. Updating either contract requires an explicit catalog version change so historical
/// telemetry remains interpretable.</para>
/// <para>Taxonomy versions originate only from a validated generated artifact through <c>ITaxonomyBroker</c>.
/// Non-taxonomy capabilities always use <see cref="GenerativeTelemetryCatalog.NotApplicableTaxonomyVersion"/>.</para>
/// </remarks>
internal readonly record struct GenerativeTelemetryMetadata(
  AnalysisCapability Capability,
  string SchemaVersion,
  string PromptVersion,
  string TaxonomyVersion);

/// <summary>
/// Provides the finite catalog of trusted generative telemetry identities.
/// </summary>
internal static class GenerativeTelemetryCatalog
{
  /// <summary>
  /// The sole taxonomy-version value for generative capabilities that do not select a taxonomy artifact.
  /// </summary>
  internal const string NotApplicableTaxonomyVersion = "not_applicable";

  /// <summary>
  /// Returns the telemetry identity for a non-taxonomy generative capability.
  /// </summary>
  /// <param name="capability">The generative capability.</param>
  /// <returns>The capability's immutable schema, prompt, and non-taxonomy identifiers.</returns>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="capability"/> is not a non-taxonomy generative capability.</exception>
  internal static GenerativeTelemetryMetadata ForNonTaxonomyCapability(AnalysisCapability capability) => capability switch
  {
    AnalysisCapability.InvoiceSummary => new(
      capability,
      "invoice-summary-schema-v1",
      "invoice-summary-prompt-v1",
      NotApplicableTaxonomyVersion),
    AnalysisCapability.AllergenAssessment => new(
      capability,
      "eu14-allergen-assessment-schema-v1",
      "eu14-allergen-assessment-prompt-v1",
      NotApplicableTaxonomyVersion),
    AnalysisCapability.RecipeGeneration => new(
      capability,
      "basket-recipe-generation-schema-v1",
      "basket-recipe-generation-prompt-v1",
      NotApplicableTaxonomyVersion),
    AnalysisCapability.DescriptionGeneration => new(
      capability,
      "merchant-description-schema-v1",
      "merchant-description-prompt-v1",
      NotApplicableTaxonomyVersion),
    _ => throw new ArgumentOutOfRangeException(
      nameof(capability),
      capability,
      "The capability does not use a non-taxonomy generative telemetry identity."),
  };

  /// <summary>
  /// Returns the telemetry identity for a classification capability using its selected trusted taxonomy artifact
  /// version.
  /// </summary>
  /// <param name="capability">The classification capability.</param>
  /// <param name="taxonomyVersion">The version declared by the selected validated taxonomy artifact.</param>
  /// <returns>The capability's immutable schema, prompt, and trusted taxonomy identifiers.</returns>
  /// <exception cref="ArgumentException">Thrown when <paramref name="taxonomyVersion"/> is null, empty, or whitespace.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="capability"/> is not a classification capability.</exception>
  internal static GenerativeTelemetryMetadata ForClassificationCapability(
    AnalysisCapability capability,
    string taxonomyVersion)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(taxonomyVersion);

    return capability switch
    {
      AnalysisCapability.ProductClassification => new(
        capability,
        "product-classification-schema-v1",
        "product-classification-prompt-v1",
        taxonomyVersion),
      AnalysisCapability.InvoiceClassification => new(
        capability,
        "invoice-classification-schema-v1",
        "invoice-classification-prompt-v1",
        taxonomyVersion),
      AnalysisCapability.MerchantClassification => new(
        capability,
        "merchant-classification-schema-v1",
        "merchant-classification-prompt-v1",
        taxonomyVersion),
      _ => throw new ArgumentOutOfRangeException(
        nameof(capability),
        capability,
        "The capability does not use a classification generative telemetry identity."),
    };
  }
}
