namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

/// <summary>
/// Thrown when Cosmos DB returns HTTP 429 (request rate too large). Carries the
/// recommended retry-after value so the mapper can surface it as a response header.
/// </summary>
[Serializable]
[ExcludeFromCodeCoverage]
public sealed class MerchantCosmosDbRateLimitException : Exception
{
	/// <summary>Initializes a new instance of the <see cref="MerchantCosmosDbRateLimitException"/> class.</summary>
	public MerchantCosmosDbRateLimitException() { }

	/// <summary>Initializes a new instance of the <see cref="MerchantCosmosDbRateLimitException"/> class with retry-after metadata.</summary>
	/// <param name="retryAfter">The recommended retry-after duration from Cosmos DB.</param>
	/// <param name="innerException">The underlying Cosmos exception.</param>
	public MerchantCosmosDbRateLimitException(TimeSpan retryAfter, Exception innerException)
		: base("Cosmos DB rate limit exceeded (HTTP 429).", innerException)
	{
		RetryAfter = retryAfter;
	}

	/// <summary>Initializes a new instance of the <see cref="MerchantCosmosDbRateLimitException"/> class with a custom message.</summary>
	/// <param name="message">The exception message.</param>
	public MerchantCosmosDbRateLimitException(string message) : base(message) { }

	/// <summary>Initializes a new instance of the <see cref="MerchantCosmosDbRateLimitException"/> class with a custom message and inner exception.</summary>
	/// <param name="message">The exception message.</param>
	/// <param name="innerException">The inner exception.</param>
	public MerchantCosmosDbRateLimitException(string message, Exception innerException)
		: base(message, innerException) { }

#pragma warning disable SYSLIB0051
	private MerchantCosmosDbRateLimitException(SerializationInfo info, StreamingContext context)
		: base(info, context) { }
#pragma warning restore SYSLIB0051

	/// <summary>Gets the recommended retry-after duration from Cosmos DB.</summary>
	public TimeSpan RetryAfter { get; }
}
