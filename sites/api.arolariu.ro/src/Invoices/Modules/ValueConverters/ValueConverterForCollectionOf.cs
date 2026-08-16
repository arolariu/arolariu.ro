namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

/// <summary>
/// Value converter between <see cref="ICollection{T}"/> and its JSON <see cref="string"/> projection.
/// </summary>
/// <remarks>
/// <para>Used for owned collections whose element type is an immutable record with a validating constructor, which EF
/// Core cannot bind as an owned navigation. Deserialization runs through the element type's public constructor so
/// invariant violations surface immediately.</para>
/// </remarks>
/// <typeparam name="T">The immutable element type being persisted.</typeparam>
[ExcludeFromCodeCoverage]
public class ValueConverterForCollectionOf<T> : ValueConverter<ICollection<T>, string>
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ValueConverterForCollectionOf{T}"/> class.
  /// </summary>
  public ValueConverterForCollectionOf() : base(
    fromCollectionOfT => ConvertToString(fromCollectionOfT),
    toCollectionOfT => ConvertFromString(toCollectionOfT))
  {
  }

  private static string ConvertToString(ICollection<T> @object) =>
    JsonSerializer.Serialize(@object ?? []);

  private static List<T> ConvertFromString(string @object)
  {
    if (string.IsNullOrWhiteSpace(@object))
    {
      return [];
    }

    return JsonSerializer.Deserialize<List<T>>(@object) ?? [];
  }
}
