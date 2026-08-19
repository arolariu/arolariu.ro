namespace arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker.ValueConverters;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

/// <summary>
/// Value converter between a nullable immutable value object and its JSON <see cref="string"/> projection.
/// </summary>
/// <remarks>
/// <para><b>Runtime status - INACTIVE:</b> <c>CosmosDatabaseBroker</c> reads and writes every invoice and merchant
/// through the raw Cosmos SDK (<c>CreateItemAsync</c> / <c>ReadItemAsync&lt;T&gt;</c> / <c>UpsertItemAsync</c> /
/// <c>ReplaceItemAsync</c>), never through a <c>DbSet</c> or <c>SaveChangesAsync</c>. Its <c>OnModelCreating</c> model
/// - and therefore this converter - does NOT participate in any production read or write. The authoritative wire
/// format is produced by the Cosmos SDK's default (Newtonsoft-based) serializer and is pinned by
/// <c>AnalysisPersistenceSerializationTests</c>. Treat this converter as dormant configuration retained for a future
/// EF migration, not as a description of current persistence behaviour.</para>
/// <para><b>Why JSON rather than an owned mapping (if EF is ever activated):</b> The analysis value objects
/// introduced by the taxonomy and allergen contracts are immutable records that expose get-only
/// <c>IReadOnlyList</c> members and enforce their invariants inside a validating constructor. EF Core cannot bind
/// collection navigations through a constructor, so an owned mapping would require weakening those contracts.</para>
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
