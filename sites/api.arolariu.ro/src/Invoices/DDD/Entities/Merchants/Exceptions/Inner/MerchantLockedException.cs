namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when a merchant is soft-deleted and cannot be mutated or read through the standard read path. Maps to HTTP 423 Locked.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantLockedException : Exception
{
	/// <summary>Initializes a new instance of the <see cref="MerchantLockedException"/> class.</summary>
	public MerchantLockedException() { }

	/// <summary>Initializes a new instance of the <see cref="MerchantLockedException"/> class with the specified merchant identifier.</summary>
	/// <param name="merchantIdentifier">The identifier of the locked merchant.</param>
	public MerchantLockedException(Guid merchantIdentifier)
		: base($"Merchant with identifier '{merchantIdentifier}' is locked (soft-deleted).")
	{
		MerchantIdentifier = merchantIdentifier;
	}

	/// <summary>Initializes a new instance of the <see cref="MerchantLockedException"/> class with a custom message.</summary>
	/// <param name="message">The exception message.</param>
	public MerchantLockedException(string message) : base(message) { }

	/// <summary>Initializes a new instance of the <see cref="MerchantLockedException"/> class with a custom message and inner exception.</summary>
	/// <param name="message">The exception message.</param>
	/// <param name="innerException">The inner exception.</param>
	public MerchantLockedException(string message, Exception innerException)
		: base(message, innerException) { }

#pragma warning disable SYSLIB0051
	private MerchantLockedException(SerializationInfo info, StreamingContext context)
		: base(info, context) { }
#pragma warning restore SYSLIB0051

	/// <summary>Gets the identifier of the locked merchant.</summary>
	public Guid MerchantIdentifier { get; }
}
