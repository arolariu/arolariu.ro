namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

/// <summary>
/// Value converter between <see cref="IEnumerable{T}"/> and <see cref="string"/>."
/// </summary>
/// <remarks>
/// <para><b>Runtime status - INACTIVE:</b> <c>InvoiceNoSqlBroker</c> performs every invoice and merchant operation
/// through the raw Cosmos SDK rather than through EF Core, so its <c>OnModelCreating</c> model - and therefore this
/// converter - never participates in a production read or write. The authoritative wire format is produced by the
/// Cosmos SDK's default (Newtonsoft-based) serializer and is pinned by <c>AnalysisPersistenceSerializationTests</c>.
/// This converter is dormant configuration retained for a future EF migration.</para>
/// </remarks>
/// <typeparam name="T">The element type being persisted.</typeparam>
[ExcludeFromCodeCoverage]
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
    @object ??= [];
    var json = JsonSerializer.Serialize(@object);
    return json;
  }

  private static IEnumerable<T> ConvertFromString(string @object)
  {
    IEnumerable<T>? result = [];
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
