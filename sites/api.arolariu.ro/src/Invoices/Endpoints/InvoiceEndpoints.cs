namespace arolariu.Backend.Domain.Invoices.Endpoints;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The invoice endpoints.
/// </summary>
[ExcludeFromCodeCoverage]
public static partial class InvoiceEndpoints
{
	private const string SemanticVersioning = "1.0.0-rc2";
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
		router.MapGroup("rest/v1").MapStandardInvoiceEndpoints();
		router.MapGroup("rest/v1").MapInvoiceAnalysisEndpoints();
		router.MapGroup("rest/v1").MapStandardMerchantEndpoints();
	}
}
