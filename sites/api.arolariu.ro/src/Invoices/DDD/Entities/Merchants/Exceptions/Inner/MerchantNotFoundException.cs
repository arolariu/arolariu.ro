namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when a merchant lookup by identifier returns no result from the data store.
/// </summary>
/// <remarks>
/// Implements <see cref="INotFoundException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 404 Not Found when this exception is surfaced, whether unwrapped or wrapped by a Foundation/Orchestration/Processing outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantNotFoundException : Exception, INotFoundException
{
/// <summary>Initializes a new instance of the <see cref="MerchantNotFoundException"/> class.</summary>
public MerchantNotFoundException() { }

/// <summary>Initializes a new instance of the <see cref="MerchantNotFoundException"/> class with the specified merchant identifier.</summary>
/// <param name="merchantIdentifier">The identifier of the merchant that was not found.</param>
public MerchantNotFoundException(Guid merchantIdentifier)
: base($"Merchant with identifier '{merchantIdentifier}' was not found.")
{
MerchantIdentifier = merchantIdentifier;
}

/// <summary>Initializes a new instance of the <see cref="MerchantNotFoundException"/> class with the specified merchant identifier and inner exception.</summary>
/// <param name="merchantIdentifier">The identifier of the merchant that was not found.</param>
/// <param name="innerException">The inner exception.</param>
public MerchantNotFoundException(Guid merchantIdentifier, Exception innerException)
: base($"Merchant with identifier '{merchantIdentifier}' was not found.", innerException)
{
MerchantIdentifier = merchantIdentifier;
}

/// <summary>Initializes a new instance of the <see cref="MerchantNotFoundException"/> class with a custom message.</summary>
/// <param name="message">The exception message.</param>
public MerchantNotFoundException(string message) : base(message) { }

/// <summary>Initializes a new instance of the <see cref="MerchantNotFoundException"/> class with a custom message and inner exception.</summary>
/// <param name="message">The exception message.</param>
/// <param name="innerException">The inner exception.</param>
public MerchantNotFoundException(string message, Exception innerException)
: base(message, innerException) { }

#pragma warning disable SYSLIB0051
private MerchantNotFoundException(SerializationInfo info, StreamingContext context)
: base(info, context) { }
#pragma warning restore SYSLIB0051

/// <summary>Gets the identifier of the merchant that was not found.</summary>
public Guid MerchantIdentifier { get; }
}
