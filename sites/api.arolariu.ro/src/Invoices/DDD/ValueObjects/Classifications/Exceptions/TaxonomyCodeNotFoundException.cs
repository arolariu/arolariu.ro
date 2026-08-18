namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications.Exceptions;

using System;

/// <summary>Identifies a canonical taxonomy code that does not exist.</summary>
public sealed class TaxonomyCodeNotFoundException : Exception
{
  /// <summary>Initializes an empty taxonomy-code exception.</summary>
  public TaxonomyCodeNotFoundException()
  {
  }

  /// <summary>Initializes the exception with a message.</summary>
  /// <param name="message">Exception message.</param>
  public TaxonomyCodeNotFoundException(string message)
    : base(message)
  {
  }

  /// <summary>Initializes the exception with a message and inner exception.</summary>
  /// <param name="message">Exception message.</param>
  /// <param name="innerException">Underlying exception.</param>
  public TaxonomyCodeNotFoundException(string message, Exception innerException)
    : base(message, innerException)
  {
  }

  /// <summary>Initializes the exception.</summary>
  public TaxonomyCodeNotFoundException(ClassificationSystem system, string code)
    : base($"Taxonomy code '{code}' was not found in '{system}'.")
  {
    System = system;
    Code = code;
  }

  /// <summary>Gets the requested taxonomy system.</summary>
  public ClassificationSystem? System { get; }

  /// <summary>Gets the requested code.</summary>
  public string? Code { get; }
}
