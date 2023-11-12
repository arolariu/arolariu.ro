using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

/// <summary>
/// Value converter between <see cref="IEnumerable{T}"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class IEnumerableOfStructTypeValueConverter<T> : ValueConverter<IEnumerable<T>, string> where T: struct
{
    /// <summary>
    /// The constructor for <see cref="IEnumerableOfStructTypeValueConverter{T}"/>
    /// </summary>
    public IEnumerableOfStructTypeValueConverter() : base(
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