namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

using arolariu.Backend.Common.Exceptions;

/// <summary>
/// Thrown when the caller has authenticated but lacks permission for the requested
/// merchant (e.g., cross-user access). Maps to HTTP 403 Forbidden.
/// </summary>
/// <remarks>
/// Implements <see cref="IForbiddenException"/>; <c>ExceptionToHttpResultMapper</c> produces HTTP 403 Forbidden when this exception is surfaced, whether unwrapped or wrapped by a higher-layer outer exception.
/// </remarks>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantForbiddenAccessException : Exception, IForbiddenException
{
/// <summary>Initializes a new instance of the <see cref="MerchantForbiddenAccessException"/> class.</summary>
public MerchantForbiddenAccessException() { }

/// <summary>Initializes a new instance of the <see cref="MerchantForbiddenAccessException"/> class with merchant and user identifiers.</summary>
/// <param name="merchantIdentifier">The identifier of the merchant that the user is forbidden from accessing.</param>
/// <param name="requestingUserIdentifier">The identifier of the user attempting to access the merchant.</param>
public MerchantForbiddenAccessException(Guid merchantIdentifier, Guid requestingUserIdentifier)
: base($"User '{requestingUserIdentifier}' is forbidden from accessing merchant '{merchantIdentifier}'.")
{
MerchantIdentifier = merchantIdentifier;
RequestingUserIdentifier = requestingUserIdentifier;
}

/// <summary>Initializes a new instance of the <see cref="MerchantForbiddenAccessException"/> class with a custom message.</summary>
/// <param name="message">The exception message.</param>
public MerchantForbiddenAccessException(string message) : base(message) { }

/// <summary>Initializes a new instance of the <see cref="MerchantForbiddenAccessException"/> class with a custom message and inner exception.</summary>
/// <param name="message">The exception message.</param>
/// <param name="innerException">The inner exception.</param>
public MerchantForbiddenAccessException(string message, Exception innerException)
: base(message, innerException) { }

#pragma warning disable SYSLIB0051
private MerchantForbiddenAccessException(SerializationInfo info, StreamingContext context)
: base(info, context) { }
#pragma warning restore SYSLIB0051

/// <summary>Gets the identifier of the merchant that the user is forbidden from accessing.</summary>
public Guid MerchantIdentifier { get; }

/// <summary>Gets the identifier of the user attempting to access the merchant.</summary>
public Guid RequestingUserIdentifier { get; }
}
