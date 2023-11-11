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
public class IEnumerableOfRecipeValueConverter : ValueConverter<IEnumerable<Recipe>, string>
{
    /// <summary>
    /// The constructor for <see cref="IEnumerableOfRecipeValueConverter"/>
    /// </summary>
    public IEnumerableOfRecipeValueConverter() : base(
    enumerable => ConvertToString(enumerable),
    enumerableAsString => ConvertFromString(enumerableAsString))
    {
    }

    private static string ConvertToString(IEnumerable<Recipe> @object)
    {
        @object ??= new List<Recipe>();
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static IEnumerable<Recipe> ConvertFromString(string @object)
    {
        IEnumerable<Recipe>? result = new List<Recipe>();
        try
        {
            result = JsonSerializer.Deserialize<IEnumerable<Recipe>>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}
