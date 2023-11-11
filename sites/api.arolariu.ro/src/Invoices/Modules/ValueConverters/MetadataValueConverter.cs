using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

/// <summary>
/// Value converter between <see cref="InvoiceMetadata"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class MetadataValueConverter : ValueConverter<InvoiceMetadata, string>
{
    /// <summary>
    /// The constructor for <see cref="InvoiceMetadata"/>
    /// </summary>
    public MetadataValueConverter() : base(
    objectFrom => ConvertToString(objectFrom),
    objectTo => ConvertFromString(objectTo))
    {
    }

    private static string ConvertToString(InvoiceMetadata @object)
    {
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static InvoiceMetadata ConvertFromString(string @object)
    {
        var result = new InvoiceMetadata();
        try
        {
            result = JsonSerializer.Deserialize<InvoiceMetadata>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}
