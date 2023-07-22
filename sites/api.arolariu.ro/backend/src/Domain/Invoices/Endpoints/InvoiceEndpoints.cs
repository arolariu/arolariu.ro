using Microsoft.AspNetCore.Routing;

namespace arolariu.Backend.Core.Domain.Invoices.Endpoints;

/// <summary>
/// The invoice endpoints.
/// </summary>
public static partial class InvoiceEndpoints
{
    private const string SemanticVersioning = "1.0.3";
    private const string EndpointNameTag = "Invoices Management System v" + SemanticVersioning;

    /// <summary>
    /// The map invoice endpoints static method, called by the app builder.
    /// This method maps all the invoice endpoints for the web application.
    /// The invoice endpoints are split into three categories:
    /// <list type="bullet">
    /// <item> Standard invoice endpoints (CRUD operations) </item>
    /// <item> Metadata invoice endpoints (metadata operations) </item>
    /// <item> Extra invoice endpoints (extra operations) </item>
    /// </list>
    /// </summary>
    /// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
    public static void MapInvoiceEndpoints(this IEndpointRouteBuilder router)
    {
        // Endpoints group: /api/invoices
        // This group contains the standard invoice endpoints (CRUD operations)
        MapStandardInvoiceEndpoints(router);

        // Endpoints group: /api/invoices/{id}/merchant
        // This group contains the merchant invoice endpoints (merchant operations)
        MapMerchantInvoiceEndpoints(router);

        // Endpoints group: /api/invoices/{id}/time
        // This group contains the time invoice endpoints (time operations)
        MapTimeInvoiceEndpoints(router);

        // Endpoints group: /api/invoices/{id}/items
        // This group contains the invoice items endpoints (invoice items operations)
        MapInvoiceItemsEndpoints(router);

        // Endpoints group: /api/invoices/{id}/metadata
        // This group contains the metadata invoice endpoints (metadata operations)
        MapMetadataInvoiceEndpoints(router);

        // Endpoints group: /api/invoices/{id}/extra
        // This group contains the extra invoice endpoints (extra operations)
        MapExtraInvoiceEndpoints(router);
    }
}
