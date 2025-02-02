namespace arolariu.Backend.Domain.Invoices.Endpoints;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Security.Claims;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

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

	/// <summary>
	/// Helper method to retrieve the user identifier from the user principal.
	/// </summary>
	/// <param name="principal"></param>
	/// <returns></returns>
	private static Guid RetrieveUserIdentifierFromPrincipal(ClaimsPrincipal principal)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveUserIdentifierFromPrincipal));
		var userIdentifierClaim = principal.Claims.FirstOrDefault(
				predicate: claim => claim.Type == "userIdentifier",
				defaultValue: new Claim(type: "userIdentifier", value: Guid.Empty.ToString()));

		var potentialUserIdentifier = Guid.Parse(userIdentifierClaim.Value);

		return potentialUserIdentifier;
	}

	/// <summary>
	/// Helper method to check if the user is a super user.
	/// Super users tipically have more permissions than regular users.
	/// </summary>
	/// <param name="principal"></param>
	/// <returns></returns>
	private static bool IsPrincipalSuperUser(ClaimsPrincipal principal)
	{
		using var activity = InvoicePackageTracing.StartActivity(nameof(IsPrincipalSuperUser));
		return true; // TODO: implement this method.
	}
}
