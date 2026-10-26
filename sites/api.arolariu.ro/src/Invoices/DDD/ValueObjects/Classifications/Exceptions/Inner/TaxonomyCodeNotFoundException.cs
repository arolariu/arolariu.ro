namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions.Inner;

using System;
using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Represents a request for a code absent from a canonical taxonomy artifact.
/// </summary>
/// <remarks>
/// The <see cref="INotFoundException"/> marker allows the shared exception-to-HTTP
/// mapping boundary to classify this domain failure as not found. The taxonomy-aware
/// constructor also preserves structured request context for diagnostics.
/// </remarks>
public sealed class TaxonomyCodeNotFoundException : Exception, INotFoundException
{
  /// <summary>
  /// Initializes an exception without message or taxonomy context.
  /// </summary>
  /// <remarks>
  /// This overload supports framework and general exception-construction conventions;
  /// prefer the taxonomy-aware overload when the failed lookup values are available.
  /// </remarks>
  public TaxonomyCodeNotFoundException()
  {
  }

  /// <summary>
  /// Initializes an exception with caller-provided diagnostic text.
  /// </summary>
  /// <param name="message">The message describing the failed taxonomy lookup.</param>
  public TaxonomyCodeNotFoundException(string message)
    : base(message)
  {
  }

  /// <summary>
  /// Initializes an exception that preserves an underlying failure.
  /// </summary>
  /// <param name="message">The message describing the failed taxonomy lookup.</param>
  /// <param name="innerException">The failure that caused this exception.</param>
  public TaxonomyCodeNotFoundException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>
  /// Initializes an exception for a specific taxonomy and requested code.
  /// </summary>
  /// <param name="system">The taxonomy searched by the caller.</param>
  /// <param name="code">The unresolved code as supplied by the caller.</param>
  public TaxonomyCodeNotFoundException(ClassificationSystem system, string code)
    : base($"Taxonomy code '{code}' was not found in '{system}'.")
  {
    System = system;
    Code = code;
  }

  /// <summary>
  /// Gets the requested taxonomy, or null when a general constructor was used.
  /// </summary>
  public ClassificationSystem? System { get; }

  /// <summary>
  /// Gets the unresolved caller-supplied code, or null when unavailable.
  /// </summary>
  public string? Code { get; }
}
