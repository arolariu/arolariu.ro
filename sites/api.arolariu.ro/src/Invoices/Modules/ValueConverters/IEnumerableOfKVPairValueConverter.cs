using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json;

namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

/// <summary>
/// Value converter between <see cref="IEnumerable{T}"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class IEnumerableOfKVPairValueConverter : ValueConverter<IEnumerable<KeyValuePair<string, object>>, string>
{
    /// <summary>
    /// The constructor for <see cref="IEnumerableOfKVPairValueConverter"/>
    /// </summary>
    public IEnumerableOfKVPairValueConverter() : base(
    enumerable => ConvertToString(enumerable),
    enumerableAsString => ConvertFromString(enumerableAsString))
    {
    }

    private static string ConvertToString(IEnumerable<KeyValuePair<string, object>> @object)
    {
        @object ??= new List<KeyValuePair<string, object>>();
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static IEnumerable<KeyValuePair<string, object>> ConvertFromString(string @object)
    {
        IEnumerable<KeyValuePair<string, object>>? result = new List<KeyValuePair<string, object>>();
        try
        {
            result = JsonSerializer.Deserialize<IEnumerable<KeyValuePair<string, object>>>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}
