using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace arolariu.Backend.Domain.Invoices.Modules.ValueConverters;

/// <summary>
/// Value converter between <see cref="Merchant"/> and <see cref="string"/>."
/// </summary>
[ExcludeFromCodeCoverage]
[SuppressMessage("Minor Code Smell", "S101:Types should be named in PascalCase", Justification = "Not applicable.")]
public class MerchantValueConverter : ValueConverter<Merchant, string>
{
    /// <summary>
    /// The constructor for <see cref="Merchant"/>
    /// </summary>
    public MerchantValueConverter() : base(
    merchantFrom => ConvertToString(merchantFrom),
    merchantTo => ConvertFromString(merchantTo))
    {
    }

    private static string ConvertToString(Merchant @object)
    {
        @object ??= new Merchant();
        var json = JsonSerializer.Serialize(@object);
        return json;
    }

    private static Merchant ConvertFromString(string @object)
    {
        Merchant? result = new Merchant();
        try
        {
            result = JsonSerializer.Deserialize<Merchant>(@object);
        }
        catch (JsonException)
        {
            // ignored
        }

        return result!;
    }
}
