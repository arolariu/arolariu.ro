namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Diagnostics.CodeAnalysis;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Represents a caller-correctable recipe suggestion request that violates domain invariants.
/// </summary>
/// <remarks>
/// This exception preserves the domain validation cause while ensuring endpoint exception mapping
/// returns HTTP 400 instead of treating malformed client recipe data as an internal server failure.
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class RecipeSuggestionRequestValidationException : Exception, IValidationException
{
  /// <summary>Initializes a new instance of the <see cref="RecipeSuggestionRequestValidationException"/> class.</summary>
  public RecipeSuggestionRequestValidationException()
  {
  }

  /// <summary>Initializes a new instance of the <see cref="RecipeSuggestionRequestValidationException"/> class.</summary>
  /// <param name="message">The safe client-facing validation message.</param>
  public RecipeSuggestionRequestValidationException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes a new instance of the <see cref="RecipeSuggestionRequestValidationException"/> class.</summary>
  /// <param name="message">The safe client-facing validation message.</param>
  /// <param name="innerException">The domain invariant exception that caused the validation failure.</param>
  public RecipeSuggestionRequestValidationException(string message, Exception innerException)
    : base(message, innerException)
  {
  }
}
