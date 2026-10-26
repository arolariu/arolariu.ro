namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System.Diagnostics.CodeAnalysis;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

/// <summary>
/// Extension host for registering all invoice and merchant related HTTP endpoints (routing surface for the Invoices bounded context).
/// </summary>
/// <remarks>
/// <para><b>Composition:</b> Split across partial class files: core mapping (<c>InvoiceEndpoints.cs</c>), handler implementations (<c>InvoiceEndpoints.Handlers.cs</c>),
/// internal helpers (<c>InvoiceEndpoints.Internals.cs</c>), response / request DTO mappings (<c>InvoiceEndpoints.Mappings.cs</c>), and metadata enhancements
/// (<c>InvoiceEndpoints.Metadata.cs</c>).</para>
/// <para><b>Versioning:</b> Current semantic package surface version stored in <c>SemanticVersioning</c>; the external public REST route uses a URI version segment (<c>rest/v1</c>)
/// decoupled from internal semantic version (allows internal additive changes without immediate URI bump).</para>
/// <para><b>Security:</b> Authentication / authorization policies are applied in handler implementations or via metadata partial. This class centralizes grouping only.</para>
/// <para><b>Telemetry:</b> Activity scopes started for helper methods (<c>RetrieveUserIdentifierClaimFromPrincipal</c>, <c>IsPrincipalSuperUser</c>) to ensure consistent trace spans.</para>
/// <para><b>Extensibility:</b> New route groups SHOULD be appended inside <see cref="MapInvoiceEndpoints"/>; consider new versioned group (<c>rest/v2</c>) for breaking changes.</para>
/// <para><b>Thread-safety:</b> Static initialization only; no mutable shared state beyond constants.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public static partial class InvoiceEndpoints
{
  /// <summary>
  /// The semantic version of the Invoice Management API surface.
  /// </summary>
  private const string SemanticVersioning = "1.0.0";

  /// <summary>
  /// The OpenAPI tag name for Invoice Management endpoints.
  /// </summary>
  private const string EndpointNameTag = "Invoice Management System v" + SemanticVersioning;

  /// <summary>
  /// Registers all invoice, invoice analysis and merchant endpoint groups into the application's routing pipeline.
  /// </summary>
  /// <remarks>
  /// <para><b>Grouping Strategy:</b> Consolidates related endpoints under the base path segment <c>rest/v1</c>.
  /// Invoice analysis is registered with invoice routes and merchant analysis with merchant routes.</para>
  /// <para><b>Idempotency:</b> Safe to invoke once during startup; repeated invocation would register duplicate endpoints (DO NOT call multiple times).</para>
  /// <para><b>Versioning Policy:</b> Route segment version (<c>v1</c>) DOES NOT auto-track semantic constant <c>SemanticVersioning</c>; bump URI only on public breaking changes.</para>
  /// <para><b>Cross-Cutting Concerns:</b> Authentication, authorization, validation, caching, and OpenAPI metadata are applied in handler / metadata partials to keep this method declarative.</para>
  /// </remarks>
  /// <param name="router">Endpoint route builder (must be non-null) used during application startup.</param>
  public static void MapInvoiceEndpoints(this IEndpointRouteBuilder router)
  {
    router.MapGroup("rest/v1").MapStandardInvoiceEndpoints();
    router.MapGroup("rest/v1").MapStandardMerchantEndpoints();
  }

}
