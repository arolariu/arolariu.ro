﻿namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

/// <summary>
/// Value converter between <see cref="IEnumerable{T}"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class ValueConverterForIEnumerableOf<T> : ValueConverter<IEnumerable<T>, string>
{
	/// <summary>
	/// The constructor for <see cref="ValueConverterForIEnumerableOf{T}"/>
	/// </summary>
	public ValueConverterForIEnumerableOf() : base(
	fromEnumerableOfT => ConvertToString(fromEnumerableOfT),
	toEnumerableOfT => ConvertFromString(toEnumerableOfT))
	{
	}

	private static string ConvertToString(IEnumerable<T> @object)
	{
		@object ??= new List<T>();
		var json = JsonSerializer.Serialize(@object);
		return json;
	}

	private static IEnumerable<T> ConvertFromString(string @object)
	{
		IEnumerable<T>? result = new List<T>();
		try
		{
			result = JsonSerializer.Deserialize<IEnumerable<T>>(@object);
		}
		catch (JsonException)
		{
			// ignored
		}

		return result!;
	}
}
