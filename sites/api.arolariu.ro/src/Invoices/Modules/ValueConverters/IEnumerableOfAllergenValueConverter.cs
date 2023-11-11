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
public class IEnumerableOfAllergenValueConverter : ValueConverter<IEnumerable<Allergen>, string>
{
    /// <summary>
    /// The constructor for <see cref="IEnumerableOfAllergenValueConverter"/>
    /// </summary>
    public IEnumerableOfAllergenValueConverter() : base(
    enumerable => ConvertToString(enumerable),
    enumerableAsString => ConvertFromString(enumerableAsString))
    {
    }

    private static string ConvertToString(IEnumerable<Allergen> @object)
    {
        @object ??= new List<Allergen>();
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static IEnumerable<Allergen> ConvertFromString(string @object)
    {
        IEnumerable<Allergen>? result = new List<Allergen>();
        try
        {
            result = JsonSerializer.Deserialize<IEnumerable<Allergen>>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}