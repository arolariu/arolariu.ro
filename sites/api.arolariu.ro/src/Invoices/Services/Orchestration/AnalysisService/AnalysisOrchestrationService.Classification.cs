namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Outer.Foundation;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Orchestrates manual and AI-assisted canonical classification workflows.
/// </summary>
public sealed partial class AnalysisOrchestrationService
{
  private const int MaximumCandidatesPerSearchTerm = 5;
  private const int MaximumCandidatesPerSubject = 10;

  /// <inheritdoc/>
  public async Task<StandardClassification?> ResolveManualClassificationAsync(
    StandardClassification? classification,
    ClassificationSystem expectedSystem,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ResolveManualClassificationAsync));

      if (classification is null)
      {
        return null;
      }

      if (classification.System != expectedSystem)
      {
        RecordTaxonomyValidationFailure(classification.System);
        throw new TaxonomyCodeNotFoundException(
          $"Classification code '{classification.Code}' was supplied for system '{classification.System}' but system '{expectedSystem}' is required here.");
      }

      return await analysisFoundationService
        .ResolveClassificationAsync(
          expectedSystem,
          classification.Code,
          ClassificationOrigin.Manual,
          confidence: null,
          classification.Evidence,
          cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<ProductClassificationResult> ClassifyProductsAsync(
    IReadOnlyList<ProductAnalysisInput> products,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyProductsAsync));
      ArgumentNullException.ThrowIfNull(products);

      if (products.Count == 0)
      {
        throw new ArgumentException("At least one product is required for classification.", nameof(products));
      }

      var subjects = products.ToDictionary(
        product => product.CorrelationToken,
        product => product.Product.Name,
        StringComparer.Ordinal);

      IReadOnlyDictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
        AnalysisCapability.ProductClassification,
        ClassificationSystem.Gs1Gpc,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);

      return new ProductClassificationResult(classifications);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<InvoiceClassificationResult> ClassifyInvoiceAsync(
    ReceiptExtractionResult extraction,
    ProductClassificationResult products,
    Guid sourceRunId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyInvoiceAsync));
      ArgumentNullException.ThrowIfNull(extraction);
      ArgumentNullException.ThrowIfNull(products);

      if (sourceRunId == Guid.Empty)
      {
        throw new ArgumentException("Source run identifier must not be empty.", nameof(sourceRunId));
      }

      var subjects = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        [sourceRunId.ToString()] = BuildInvoiceDescription(extraction, products),
      };

      Dictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
        AnalysisCapability.InvoiceClassification,
        ClassificationSystem.EcoicopV2,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);

      return new InvoiceClassificationResult(classifications[sourceRunId.ToString()]);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<MerchantClassificationResult> ClassifyMerchantAsync(
    Merchant merchant,
    Guid sourceRunId,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ClassifyMerchantAsync));
      ArgumentNullException.ThrowIfNull(merchant);

      if (sourceRunId == Guid.Empty)
      {
        throw new ArgumentException("Source run identifier must not be empty.", nameof(sourceRunId));
      }

      var subjects = new Dictionary<string, string>(StringComparer.Ordinal)
      {
        [sourceRunId.ToString()] = BuildMerchantDescription(merchant),
      };

      Dictionary<string, StandardClassification> classifications = await ClassifyBatchAsync(
        AnalysisCapability.MerchantClassification,
        ClassificationSystem.Nace21,
        subjects,
        cancellationToken)
        .ConfigureAwait(false);

      return new MerchantClassificationResult(classifications[sourceRunId.ToString()]);
    }).ConfigureAwait(false);

  private async Task<Dictionary<string, StandardClassification>> ClassifyBatchAsync(
    AnalysisCapability capability,
    ClassificationSystem system,
    Dictionary<string, string> subjectDescriptions,
    CancellationToken cancellationToken)
  {
    string taxonomyVersion = await analysisFoundationService
      .GetTaxonomyVersionAsync(system, cancellationToken)
      .ConfigureAwait(false);

    IReadOnlyDictionary<string, IReadOnlyList<string>> searchTermsByToken = await analysisFoundationService
      .GenerateClassificationSearchTermsAsync(capability, system, taxonomyVersion, subjectDescriptions, cancellationToken)
      .ConfigureAwait(false);

    var candidatesByToken = new Dictionary<string, IReadOnlyList<ClassificationCandidateOption>>(StringComparer.Ordinal);

    foreach ((string token, string description) in subjectDescriptions)
    {
      IReadOnlyList<string> searchTerms = searchTermsByToken[token];
      ValidateSearchTermsAreUsable(searchTerms, token);
      candidatesByToken[token] = await CollectBoundedCandidatesAsync(system, searchTerms, cancellationToken).ConfigureAwait(false);
    }

    IReadOnlyDictionary<string, SelectedClassificationCandidate> selections = await analysisFoundationService
      .SelectClassificationCandidatesAsync(capability, system, taxonomyVersion, candidatesByToken, cancellationToken)
      .ConfigureAwait(false);

    var classifications = new Dictionary<string, StandardClassification>(StringComparer.Ordinal);

    foreach ((string token, IReadOnlyList<ClassificationCandidateOption> candidates) in candidatesByToken)
    {
      SelectedClassificationCandidate selection = selections[token];
      ValidateSelectedCodeIsCandidate(selection.Code, candidates, token);

      try
      {
        classifications[token] = await analysisFoundationService
          .ResolveClassificationAsync(
            system,
            selection.Code,
            ClassificationOrigin.Analysis,
            NormalizeConfidence(selection.Confidence),
            [new ClassificationEvidence("subject.description", subjectDescriptions[token])],
            cancellationToken)
          .ConfigureAwait(false);
      }
      catch (AnalysisFoundationDependencyValidationException exception)
        when (exception.InnerException is TaxonomyCodeNotFoundException)
      {
        RecordTaxonomyValidationFailure(system);
        throw;
      }
    }

    return classifications;
  }

  private async Task<IReadOnlyList<ClassificationCandidateOption>> CollectBoundedCandidatesAsync(
    ClassificationSystem system,
    IReadOnlyList<string> searchTerms,
    CancellationToken cancellationToken)
  {
    var candidates = new List<ClassificationCandidateOption>();
    var seenCodes = new HashSet<string>(StringComparer.Ordinal);

    foreach (string searchTerm in searchTerms)
    {
      if (candidates.Count >= MaximumCandidatesPerSubject || string.IsNullOrWhiteSpace(searchTerm))
      {
        continue;
      }

      IReadOnlyList<ClassificationCandidateOption> matches = await analysisFoundationService
        .SearchTaxonomyAsync(system, searchTerm, MaximumCandidatesPerSearchTerm, cancellationToken)
        .ConfigureAwait(false);

      foreach (ClassificationCandidateOption match in matches)
      {
        if (candidates.Count >= MaximumCandidatesPerSubject)
        {
          break;
        }

        if (seenCodes.Add(match.Code))
        {
          candidates.Add(match);
        }
      }
    }

    return candidates;
  }

  private static void ValidateSearchTermsAreUsable(IReadOnlyList<string> searchTerms, string correlationToken)
  {
    if (searchTerms.Count == 0 || searchTerms.All(string.IsNullOrWhiteSpace))
    {
      throw new InvalidStructuredOutputException(
        $"No usable search terms were produced for correlation token '{correlationToken}'.");
    }
  }

  private static void ValidateSelectedCodeIsCandidate(
    string selectedCode,
    IReadOnlyList<ClassificationCandidateOption> candidates,
    string correlationToken)
  {
    if (string.IsNullOrWhiteSpace(selectedCode))
    {
      throw new InvalidStructuredOutputException(
        $"No taxonomy code was selected for correlation token '{correlationToken}'.");
    }

    bool isKnownCandidate = candidates.Any(candidate => string.Equals(candidate.Code, selectedCode, StringComparison.Ordinal));

    if (!isKnownCandidate)
    {
      throw new InvalidStructuredOutputException(
        $"Selected taxonomy code '{selectedCode}' for correlation token '{correlationToken}' was not among the offered candidates.");
    }
  }

  private static double NormalizeConfidence(double confidence) => Math.Clamp(confidence, 0d, 1d);

  private static string BuildInvoiceDescription(ReceiptExtractionResult extraction, ProductClassificationResult products)
  {
    IEnumerable<string> productNames = extraction.Products
      .Select(product => product.Name)
      .Where(name => !string.IsNullOrWhiteSpace(name));

    IEnumerable<string> productCategories = products.Classifications.Values
      .Select(classification => classification.OfficialLabel)
      .Distinct(StringComparer.Ordinal);

    return string.Join(
      " ",
      $"Receipt type: {extraction.ReceiptType}.",
      $"Products: {string.Join(", ", productNames)}.",
      $"Detected product categories: {string.Join(", ", productCategories)}.");
  }

  private static string BuildMerchantDescription(Merchant merchant) =>
    string.Join(
      " ",
      $"Merchant name: {merchant.Name}.",
      $"Category: {merchant.Classification?.OfficialLabel ?? "unknown"}.",
      $"Address: {merchant.Address.Address}.");

  private void RecordTaxonomyValidationFailure(ClassificationSystem classificationSystem)
  {
    InvoiceMetrics.RecordTaxonomyValidationFailure(classificationSystem);
    logger.LogAnalysisTaxonomyValidationFailed(classificationSystem);
  }

}
