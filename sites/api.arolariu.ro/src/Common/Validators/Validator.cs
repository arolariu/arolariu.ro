namespace arolariu.Backend.Common.Validators;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Provides generic validation utilities for objects with custom predicate logic and exception handling.
/// This static class enables type-safe validation with configurable exception types.
/// </summary>
/// <remarks>
/// The Validator class supports:
/// - Generic object validation with custom predicates
/// - Configurable exception types for different validation scenarios
/// - Null safety with built-in null checks
/// - Dynamic exception creation with custom messages
/// </remarks>
/// <example>
/// <code>
/// // Validate a non-null object
/// Validator.ValidateAndThrow&lt;string, ArgumentNullException&gt;(
///     value,
///     v => !string.IsNullOrEmpty(v),
///     "Value cannot be null or empty");
///
/// // Validate business rules
/// Validator.ValidateAndThrow&lt;Order, InvalidOperationException&gt;(
///     order,
///     o => o.Total > 0,
///     "Order total must be greater than zero");
/// </code>
/// </example>
[ExcludeFromCodeCoverage]
public static class Validator
{
	/// <summary>
	/// Validates an object against a predicate and throws a specified exception type if validation fails.
	/// This method performs null checking before applying the custom validation logic.
	/// </summary>
	/// <typeparam name="TObject">The type of object to validate.</typeparam>
	/// <typeparam name="TException">The type of exception to throw on validation failure. Must have a constructor that accepts a string message.</typeparam>
	/// <param name="object">The object to validate. Can be null.</param>
	/// <param name="predicate">The validation logic to apply. Must not be null.</param>
	/// <param name="message">The error message to include in the exception if validation fails.</param>
	/// <remarks>
	/// Validation logic:
	/// 1. Checks if the object is null
	/// 2. If not null, applies the predicate function
	/// 3. Throws TException with the provided message if either check fails
	/// 4. Uses Activator.CreateInstance to create the exception dynamically
	/// </remarks>
	/// <exception cref="ArgumentNullException">
	/// Thrown when <paramref name="predicate"/> is null.
	/// </exception>
	private static void ValidateObjectAndThrow<TObject,
		[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.All)] TException>(
		TObject? @object,
		Func<TObject?, bool> predicate,
		string message)
		where TException : Exception, new()
	{
		var objectIsValid = @object is not null && predicate(@object);
		if (!objectIsValid)
		{
			var exception = Activator.CreateInstance(typeof(TException), message);
			throw (TException)exception!;
		}
	}

	/// <summary>
	/// Validates an object using custom logic and throws a specified exception type on failure.
	/// This is the main public entry point for object validation with configurable exception handling.
	/// </summary>
	/// <typeparam name="TObject">The type of object being validated.</typeparam>
	/// <typeparam name="TException">The exception type to throw on validation failure. Must inherit from Exception and have a string constructor.</typeparam>
	/// <param name="object">The object to validate against the predicate.</param>
	/// <param name="predicate">A function that defines the validation logic. Returns true if valid, false otherwise.</param>
	/// <param name="message">The error message to use when creating the exception.</param>
	/// <remarks>
	/// This method enables flexible validation scenarios:
	/// - Input parameter validation with ArgumentException
	/// - Business rule validation with custom exceptions
	/// - State validation with InvalidOperationException
	/// - Security validation with UnauthorizedAccessException
	/// </remarks>
	/// <exception cref="ArgumentNullException">
	/// Thrown when <paramref name="predicate"/> is null.
	/// </exception>
	/// <example>
	/// <code>
	/// // Parameter validation
	/// Validator.ValidateAndThrow&lt;string, ArgumentException&gt;(
	///     email,
	///     e => e.Contains("@"),
	///     "Invalid email format");
	///
	/// // Business rule validation
	/// Validator.ValidateAndThrow&lt;User, InvalidOperationException&gt;(
	///     user,
	///     u => u.IsActive,
	///     "User account is not active");
	///
	/// // Range validation
	/// Validator.ValidateAndThrow&lt;int, ArgumentOutOfRangeException&gt;(
	///     age,
	///     a => a >= 0 and a less than 120,
	///     "Age must be between 0 and 120");
	/// </code>
	/// </example>
	[SuppressMessage("Naming", "CA1720:Identifier contains type name", Justification = "Parameter name 'object' is contextually appropriate for generic validation")]
	public static void ValidateAndThrow<TObject, [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.All)] TException>(
		TObject? @object,
		Func<TObject?, bool> predicate,
		string message)
		where TException : Exception, new()
	{
		ArgumentNullException.ThrowIfNull(predicate);
		ValidateObjectAndThrow<TObject, TException>(@object, predicate, message);
	}
}
