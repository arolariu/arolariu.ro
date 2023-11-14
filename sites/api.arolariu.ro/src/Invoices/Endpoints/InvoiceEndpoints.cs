using Microsoft.AspNetCore.Routing;

using System.Diagnostics.CodeAnalysis;

namespace arolariu.Backend.Domain.Invoices.Endpoints;

/// <summary>
/// The invoice endpoints.
/// </summary>
[ExcludeFromCodeCoverage]
public static partial class InvoiceEndpoints
{
    private const string SemanticVersioning = "0.3.0-rc1";
    private const string EndpointNameTag = "Invoices Management System v" + SemanticVersioning;

    /// <summary>
    /// The map invoice endpoints static method, called by the app builder.
    /// This method maps all the invoice endpoints for the web application.
    /// The invoice endpoints are split into categories:
    /// <list type="bullet">
    /// <item> Standard invoice endpoints (CRUD operations) </item>
    /// </list>
    /// </summary>
    /// <param name="router">The <see cref="IEndpointRouteBuilder"/> used for mapping the endpoints.</param>
    public static void MapInvoiceEndpoints(this IEndpointRouteBuilder router)
    {
        // Endpoints group: /api/invoices
        // This group contains the standard invoice endpoints (CRUD operations)
        MapStandardInvoiceEndpoints(router);

        // This group contains the invoice analysis endpoints
        MapInvoiceAnalysisEndpoints(router);
    }
}
