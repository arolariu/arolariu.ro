namespace arolariu.Backend.Common.Validators;
using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Validator that checks if an object meets a certain criteria.
/// </summary>
[ExcludeFromCodeCoverage]
public static class Validator
{
	/// <summary>
	/// Validates a class object.
	/// </summary>
	/// <typeparam name="TObject"></typeparam>
	/// <typeparam name="TException"></typeparam>
	/// <param name="object"></param>
	/// <param name="predicate"></param>
	/// <param name="message"></param>
	/// <example>
	/// Validator.ValidateClassObject(object, object => object is not null);
	/// </example>
	/// <returns></returns>
	private static void ValidateObjectAndThrow<TObject,
		[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)] TException>(
		TObject? @object,
		Func<TObject?, bool> predicate,
		string message)
		where TException : Exception, new()
	{
		var meetsCriteria = @object is not null && predicate(@object);
		if (!meetsCriteria)
		{
			var exception = Activator.CreateInstance(typeof(TException), message);
			throw (TException)exception!;
		}
	}

	/// <summary>
	/// Validates and throws an exception if the object does not meet the criteria.
	/// </summary>
	/// <typeparam name="TObject"></typeparam>
	/// <typeparam name="TException"></typeparam>
	/// <param name="object"></param>
	/// <param name="predicate"></param>
	/// <param name="message"></param>
	[SuppressMessage("Naming", "CA1720:Identifier contains type name", Justification = "Not applicable in current context")]
	public static void ValidateAndThrow<TObject,
		[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)] TException>(
		TObject? @object,
		Func<TObject?, bool> predicate,
		string message)
		where TException : Exception, new()
	{
		ArgumentNullException.ThrowIfNull(predicate);
		ValidateObjectAndThrow<TObject, TException>(@object, predicate, message);
	}
}
