namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when the dependency rejects the request due to missing/invalid authentication (HTTP 401 at Cosmos or downstream boundary).
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantUnauthorizedAccessException : Exception
{
	/// <summary>Initializes a new instance of the <see cref="MerchantUnauthorizedAccessException"/> class.</summary>
	public MerchantUnauthorizedAccessException() { }

	/// <summary>Initializes a new instance of the <see cref="MerchantUnauthorizedAccessException"/> class with a custom message.</summary>
	/// <param name="message">The exception message.</param>
	public MerchantUnauthorizedAccessException(string message) : base(message) { }

	/// <summary>Initializes a new instance of the <see cref="MerchantUnauthorizedAccessException"/> class with a custom message and inner exception.</summary>
	/// <param name="message">The exception message.</param>
	/// <param name="innerException">The inner exception.</param>
	public MerchantUnauthorizedAccessException(string message, Exception innerException)
		: base(message, innerException) { }

#pragma warning disable SYSLIB0051
	private MerchantUnauthorizedAccessException(SerializationInfo info, StreamingContext context)
		: base(info, context) { }
#pragma warning restore SYSLIB0051
}
