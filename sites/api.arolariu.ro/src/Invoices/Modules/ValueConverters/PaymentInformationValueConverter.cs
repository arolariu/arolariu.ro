using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Contracts;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

/// <summary>
/// Value converter between <see cref="PaymentInformation"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class PaymentInformationValueConverter : ValueConverter<PaymentInformation, string>
{
    /// <summary>
    /// The constructor for <see cref="PaymentInformation"/>
    /// </summary>
    public PaymentInformationValueConverter() : base(
    objectFrom => ConvertToString(objectFrom),
    objectTo => ConvertFromString(objectTo))
    {
    }

    private static string ConvertToString(PaymentInformation @object)
    {
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static PaymentInformation ConvertFromString(string @object)
    {
        var result = new PaymentInformation();
        try
        {
            result = JsonSerializer.Deserialize<PaymentInformation>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}
