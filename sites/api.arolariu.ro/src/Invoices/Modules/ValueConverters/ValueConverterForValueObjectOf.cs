namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

/// <summary>
/// Value converter between a nullable immutable value object and its JSON <see cref="string"/> projection.
/// </summary>
/// <remarks>
/// <para><b>Why JSON rather than an owned mapping:</b> The analysis value objects introduced by the taxonomy and
/// allergen contracts are immutable records that expose get-only <c>IReadOnlyList</c> members and enforce their
/// invariants inside a validating constructor. EF Core cannot bind collection navigations through a constructor, so an
/// owned mapping would require weakening those contracts. Serializing the whole value object keeps the domain
/// invariants authoritative and matches the JSON projection already used for the other embedded collections in this
/// context.</para>
/// <para><b>Round-trip safety:</b> Deserialization runs through the value object's public constructor, so a document
/// that violates an invariant fails loudly rather than materializing an invalid aggregate.</para>
/// </remarks>
/// <typeparam name="T">The immutable value object type being persisted.</typeparam>
[ExcludeFromCodeCoverage]
public class ValueConverterForValueObjectOf<T> : ValueConverter<T?, string>
  where T : class
{
  /// <summary>
  /// Initializes a new instance of the <see cref="ValueConverterForValueObjectOf{T}"/> class.
  /// </summary>
  public ValueConverterForValueObjectOf() : base(
    fromValueObject => ConvertToString(fromValueObject),
    toValueObject => ConvertFromString(toValueObject))
  {
  }

  private static string ConvertToString(T? @object) =>
    @object is null ? string.Empty : JsonSerializer.Serialize(@object);

  private static T? ConvertFromString(string @object)
  {
    if (string.IsNullOrWhiteSpace(@object))
    {
      return null;
    }

    return JsonSerializer.Deserialize<T>(@object);
  }
}
