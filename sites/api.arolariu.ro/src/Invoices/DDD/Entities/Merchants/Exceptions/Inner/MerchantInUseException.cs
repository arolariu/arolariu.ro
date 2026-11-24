namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;

using arolariu.Backend.Common.Exceptions;

/// <summary>Indicates that a merchant cannot be deleted while active invoices reference it.</summary>
public sealed class MerchantInUseException : Exception, IAlreadyExistsException
{
  /// <summary>Creates a conflict for a merchant with active invoice references.</summary>
  public MerchantInUseException() : base("The merchant is referenced by active invoices.") { }

  /// <summary>Creates a conflict with a specific diagnostic message.</summary>
  /// <param name="message">The diagnostic message.</param>
  public MerchantInUseException(string message) : base(message) { }

  /// <summary>Creates a conflict with an underlying cause.</summary>
  /// <param name="message">The diagnostic message.</param>
  /// <param name="innerException">The underlying cause.</param>
  public MerchantInUseException(string message, Exception innerException) : base(message, innerException) { }
}
