using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

/// <summary>
/// Value converter between <see cref="InvoiceTimeInformation"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class TimeInformationValueConverter : ValueConverter<InvoiceTimeInformation, string>
{
    /// <summary>
    /// The constructor for <see cref="InvoiceTimeInformation"/>
    /// </summary>
    public TimeInformationValueConverter() : base(
    objectFrom => ConvertToString(objectFrom),
    objectTO => ConvertFromString(objectTO))
    {
    }

    private static string ConvertToString(InvoiceTimeInformation @object)
    {
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static InvoiceTimeInformation ConvertFromString(string @object)
    {
        var result = new InvoiceTimeInformation();
        try
        {
            result = JsonSerializer.Deserialize<InvoiceTimeInformation>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}
