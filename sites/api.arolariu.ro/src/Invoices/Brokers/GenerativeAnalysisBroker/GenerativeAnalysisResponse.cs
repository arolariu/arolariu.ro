namespace arolariu.Backend.Domain.Invoices.Brokers.GenerativeAnalysisBroker;

using System;

/// <summary>
/// Represents a typed structured response produced by the generative AI broker.
/// </summary>
/// <typeparam name="T">The structured output type requested from the provider.</typeparam>
public sealed record GenerativeAnalysisResponse<T>
  where T : class
{
  /// <summary>
  /// Initializes a new instance of the <see cref="GenerativeAnalysisResponse{T}"/> record.
  /// </summary>
  /// <param name="value">The typed structured result produced by the provider.</param>
  /// <param name="modelId">The provider model identifier that produced the response, if reported.</param>
  /// <param name="usage">The non-sensitive token usage metadata for the response, if reported.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="value"/> is null.</exception>
  public GenerativeAnalysisResponse(T value, string? modelId, GenerativeUsage? usage)
  {
    Value = value ?? throw new ArgumentNullException(nameof(value));
    ModelId = modelId;
    Usage = usage;
  }

  /// <summary>Gets the typed structured result produced by the provider.</summary>
  public T Value { get; }

  /// <summary>Gets the provider model identifier that produced the response, if reported.</summary>
  public string? ModelId { get; }

  /// <summary>Gets the non-sensitive token usage metadata for the response, if reported.</summary>
  public GenerativeUsage? Usage { get; }
}

/// <summary>
/// Represents non-sensitive token usage metadata captured for a generative AI response.
/// </summary>
/// <param name="InputTokenCount">The number of tokens consumed by the request input, if reported.</param>
/// <param name="OutputTokenCount">The number of tokens produced in the response output, if reported.</param>
/// <param name="TotalTokenCount">The total number of tokens attributed to the request/response pair, if reported.</param>
public sealed record GenerativeUsage(long? InputTokenCount, long? OutputTokenCount, long? TotalTokenCount);
