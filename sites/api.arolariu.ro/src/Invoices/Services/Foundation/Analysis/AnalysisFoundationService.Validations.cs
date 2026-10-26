namespace arolariu.Backend.Domain.Invoices.Services.Foundation.Analysis;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

public sealed partial class AnalysisFoundationService
{
  private static void ValidateScansAreSet(IReadOnlyList<InvoiceScan> scans)
  {
    ArgumentNullException.ThrowIfNull(scans);

    if (scans.Count == 0)
    {
      throw new ArgumentException("At least one invoice scan is required for typed receipt extraction.", nameof(scans));
    }
  }

  private static void ValidateScanIsUsable(
    InvoiceScan scan,
    int index)
  {
    if (!InvoiceScan.NotDefault(scan))
    {
      throw new ArgumentException(
        $"Invoice scan at index {index} must not be the default sentinel value.",
        nameof(scan));
    }

    if (!InvoiceScan.IsSupportedByDocumentIntelligence(scan.Type))
    {
      throw new ArgumentException(
        $"Invoice scan at index {index} has an unsupported scan type.",
        nameof(scan));
    }

    if (scan.Location is null || !scan.Location.IsAbsoluteUri)
    {
      throw new ArgumentException(
        $"Invoice scan at index {index} must have an absolute location URI.",
        nameof(scan));
    }
  }

  private static void ValidateDocumentIntelligenceRecordIsSet(
    DocumentIntelligenceRecord documentIntelligenceRecord) =>
    ArgumentNullException.ThrowIfNull(documentIntelligenceRecord);

  private static void ValidateProductsAreSet(IReadOnlyList<ProductAnalysisInput> products)
  {
    ArgumentNullException.ThrowIfNull(products);

    if (products.Count == 0)
    {
      throw new ArgumentException("At least one product is required for the requested analysis capability.", nameof(products));
    }

    ValidateCorrelationTokensAreUnique(products.Select(product => product.CorrelationToken));
  }

  private static void ValidateClassificationSubjectsAreSet(
    IReadOnlyDictionary<string, string> subjectDescriptions)
  {
    ArgumentNullException.ThrowIfNull(subjectDescriptions);

    if (subjectDescriptions.Count == 0)
    {
      throw new ArgumentException(
        "At least one classification subject is required.",
        nameof(subjectDescriptions));
    }

    ValidateCorrelationTokensAreUnique(subjectDescriptions.Keys);

    foreach ((string token, string description) in subjectDescriptions)
    {
      if (string.IsNullOrWhiteSpace(token))
      {
        throw new ArgumentException(
          "Classification subject correlation tokens must not be blank.",
          nameof(subjectDescriptions));
      }

      if (string.IsNullOrWhiteSpace(description))
      {
        throw new ArgumentException(
          "Classification subject descriptions must not be blank.",
          nameof(subjectDescriptions));
      }
    }
  }

  private static void ValidateClassificationCandidatesAreSet(
    IReadOnlyDictionary<string, IReadOnlyList<ClassificationCandidateOption>> candidatesByToken)
  {
    ArgumentNullException.ThrowIfNull(candidatesByToken);

    if (candidatesByToken.Count == 0)
    {
      throw new ArgumentException(
        "At least one classification candidate set is required.",
        nameof(candidatesByToken));
    }

    ValidateCorrelationTokensAreUnique(candidatesByToken.Keys);

    foreach ((string token, IReadOnlyList<ClassificationCandidateOption> candidates) in candidatesByToken)
    {
      if (string.IsNullOrWhiteSpace(token))
      {
        throw new ArgumentException(
          "Classification candidate correlation tokens must not be blank.",
          nameof(candidatesByToken));
      }

      if (candidates is null || candidates.Count == 0)
      {
        throw new ArgumentException(
          "Each classification subject must provide at least one canonical candidate.",
          nameof(candidatesByToken));
      }
    }
  }

  private static void ValidateExtractionIsSet(ReceiptExtraction extraction) =>
    ArgumentNullException.ThrowIfNull(extraction);

  private static void ValidateProductClassificationsAreSet(
    IReadOnlyDictionary<string, StandardClassification> classifications) =>
    ArgumentNullException.ThrowIfNull(classifications);

  private static void ValidateProductAllergenAssessmentsAreSet(
    IReadOnlyDictionary<string, AllergenAssessment> allergens) =>
    ArgumentNullException.ThrowIfNull(allergens);

  private static void ValidateMerchantIsSet(Merchant merchant) =>
    ArgumentNullException.ThrowIfNull(merchant);

  private static void ValidateMaximumRecipes(int maximumRecipes)
  {
    if (maximumRecipes is < 1 or > 3)
    {
      throw new ArgumentOutOfRangeException(nameof(maximumRecipes), maximumRecipes, "Maximum recipes must be in the inclusive range [1, 3].");
    }
  }

  private static void ValidateSourceRunId(Guid sourceRunId, string parameterName)
  {
    if (sourceRunId == Guid.Empty)
    {
      throw new ArgumentException("Source run identifier must not be the empty guid.", parameterName);
    }
  }

  private static void ValidateCorrelationTokensAreUnique(IEnumerable<string> correlationTokens)
  {
    var seenTokens = new HashSet<string>(StringComparer.Ordinal);

    foreach (string correlationToken in correlationTokens)
    {
      if (!seenTokens.Add(correlationToken))
      {
        throw new ArgumentException(
          $"Duplicate correlation token '{correlationToken}' is not permitted within a single classification batch.",
          nameof(correlationTokens));
      }
    }
  }

  private static void ValidateAllergenAssessmentsCoverProducts(
    IReadOnlyList<ProductAnalysisInput> products,
    IReadOnlyDictionary<string, AllergenAssessment> allergens)
  {
    var expectedTokens = products
      .Select(product => product.CorrelationToken)
      .ToHashSet(StringComparer.Ordinal);

    var actualTokens = allergens.Keys.ToHashSet(StringComparer.Ordinal);

    if (!expectedTokens.SetEquals(actualTokens))
    {
      throw new ArgumentException("Allergen assessments must contain exactly one entry for each requested product correlation token.", nameof(allergens));
    }
  }

  private static string RequireStructuredText(string? value, string fieldName)
  {
    if (string.IsNullOrWhiteSpace(value))
    {
      throw new InvalidStructuredOutputException($"Structured output field '{fieldName}' must not be null, empty, or whitespace.");
    }

    return value.Trim();
  }

  private static string? NormalizeStructuredOptionalText(string? value) =>
    string.IsNullOrWhiteSpace(value) ? null : value.Trim();

  private static int RequireStructuredPositive(int value, string fieldName)
  {
    if (value <= 0)
    {
      throw new InvalidStructuredOutputException($"Structured output field '{fieldName}' must be greater than zero.");
    }

    return value;
  }

  private static int RequireStructuredNonNegative(int value, string fieldName)
  {
    if (value < 0)
    {
      throw new InvalidStructuredOutputException($"Structured output field '{fieldName}' must be greater than or equal to zero.");
    }

    return value;
  }

  private static double RequireStructuredConfidence(double value, string fieldName)
  {
    if (double.IsNaN(value) || double.IsInfinity(value) || value < 0d || value > 1d)
    {
      throw new InvalidStructuredOutputException($"Structured output field '{fieldName}' must be in the inclusive range [0, 1].");
    }

    return value;
  }

  private static TResult CreateFromStructuredOutput<TResult>(Func<TResult> factory, string context)
  {
    try
    {
      return factory();
    }
    catch (InvalidStructuredOutputException)
    {
      throw;
    }
    catch (ArgumentException exception)
    {
      throw new InvalidStructuredOutputException(context, exception);
    }
  }
}
