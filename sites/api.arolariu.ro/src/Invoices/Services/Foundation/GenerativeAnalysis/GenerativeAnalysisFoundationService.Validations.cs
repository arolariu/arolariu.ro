namespace arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

public sealed partial class GenerativeAnalysisFoundationService
{
  private static void ValidateProductsAreSet(IReadOnlyList<ProductAnalysisInput> products)
  {
    ArgumentNullException.ThrowIfNull(products);

    if (products.Count == 0)
    {
      throw new ArgumentException("At least one product is required for GPC classification.", nameof(products));
    }

    ValidateCorrelationTokensAreUnique(products.Select(product => product.CorrelationToken));
  }

  private static void ValidateExtractionIsSet(ReceiptExtractionResult extraction) =>
    ArgumentNullException.ThrowIfNull(extraction);

  private static void ValidateProductClassificationResultIsSet(ProductClassificationResult products) =>
    ArgumentNullException.ThrowIfNull(products);

  private static void ValidateProductAllergenAssessmentResultIsSet(ProductAllergenAssessmentResult allergens) =>
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
    ProductAllergenAssessmentResult allergens)
  {
    var expectedTokens = products
      .Select(product => product.CorrelationToken)
      .ToHashSet(StringComparer.Ordinal);

    var actualTokens = allergens.Assessments.Keys.ToHashSet(StringComparer.Ordinal);

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
