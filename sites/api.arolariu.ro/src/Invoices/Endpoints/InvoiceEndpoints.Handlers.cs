namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;

using static arolariu.Backend.Common.GuidConstants;
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;
using arolariu.Backend.Common.Telemetry.Tracing;

public static partial class InvoiceEndpoints
{
  #region CRUD operations for the Invoice Standard Endpoints
  internal static async partial Task<IResult> CreateNewInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    CreateInvoiceRequestDto invoiceDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewInvoiceAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("CRUD.Create");

      var invoice = invoiceDto.ToInvoice();
      activity?.SetInvoiceContext(invoice.id, invoice.UserIdentifier);

      await invoiceProcessingService
        .CreateInvoice(invoice)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice created successfully");
      var responseDto = InvoiceResponseDto.FromInvoice(invoice);
      return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", responseDto);
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("CRUD.Read");

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      var isGuestUser = potentialUserIdentifier == EmptyGuid;

      if (activity is not null)
      {
        activity.SetInvoiceContext(id, potentialUserIdentifier);
        activity.SetTag("user.is_guest", isGuestUser);
      }

      // Access Control Strategy:
      // 1. If authenticated user, first try point read with partition key (efficient owner lookup)
      // 2. If not found or guest user, do cross-partition read (for shared/public invoices)
      // 3. Then apply access control matrix on the result

      Invoice? possibleInvoice = null;

      // Step 1: Try point read with partition key if authenticated (owner scenario)
      if (!isGuestUser)
      {
        possibleInvoice = await invoiceProcessingService
          .ReadInvoice(id, potentialUserIdentifier)
          .ConfigureAwait(false);
      }

      // Step 2: If not found (or guest), try cross-partition read (shared/public scenario)
      possibleInvoice ??= await invoiceProcessingService
          .ReadInvoice(id, userIdentifier: null)
          .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      // Step 3: Access Control Matrix
      // 1. Public invoices (SharedWith contains LastGuid) are accessible to everyone
      // 2. Invoice owner (UserIdentifier matches) can always access
      // 3. Users with whom the invoice is shared (SharedWith contains user) can access
      // 4. All other access attempts are forbidden
      var isPublicInvoice = possibleInvoice.SharedWith.Contains(LastGuid);
      var isOwner = possibleInvoice.UserIdentifier == potentialUserIdentifier;
      var isSharedWithUser = possibleInvoice.SharedWith.Contains(potentialUserIdentifier);

      var canAccess = isPublicInvoice || (!isGuestUser && (isOwner || isSharedWithUser));

      activity?
        .SetTag("access.is_public", isPublicInvoice)
        .SetTag("access.is_owner", isOwner)
        .SetTag("access.is_shared", isSharedWithUser)
        .SetTag("access.granted", canAccess);

      if (!canAccess)
      {
        activity?.AddCustomEvent("access.denied", new Dictionary<string, object?> { ["invoice.id"] = id.ToString() });
        return TypedResults.Forbid();
      }

      activity?.RecordSuccess("Invoice retrieved successfully");
      return TypedResults.Ok(InvoiceResponseDto.FromInvoice(possibleInvoice));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveAllInvoicesAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext
    )
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("CRUD.ReadAll");

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetUserContext(potentialUserIdentifier);

      var possibleInvoices = await invoiceProcessingService
        .ReadInvoices(potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.SetTag("result.count", possibleInvoices?.Count() ?? 0);
      activity?.RecordSuccess();

      return possibleInvoices is null ? TypedResults.NotFound() : TypedResults.Ok(possibleInvoices.Select(InvoiceResponseDto.FromInvoice));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> DeleteInvoicesAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext
    )
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoicesAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("CRUD.DeleteAll");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetUserContext(potentialUserIdentifier);

      await invoiceProcessingService
        .DeleteInvoices(potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("All invoices deleted successfully");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> UpdateSpecificInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateInvoiceRequestDto invoicePayload)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("CRUD.Update");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var updatedInvoiceEntity = invoicePayload.ToInvoice(id, potentialUserIdentifier);

      // Preserve scans from the original invoice (scans are managed through dedicated endpoints)
      foreach (var scan in possibleInvoice.Scans)
      {
        updatedInvoiceEntity.Scans.Add(scan);
      }

      var updatedInvoice = await invoiceProcessingService
        .UpdateInvoice(updatedInvoiceEntity, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice updated successfully");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: InvoiceResponseDto.FromInvoice(updatedInvoice));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> PatchSpecificInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    PatchInvoiceRequestDto invoicePayload)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PatchSpecificInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("CRUD.Patch");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var newInvoice = invoicePayload.ApplyTo(possibleInvoice, potentialUserIdentifier);

      // If the merchant reference was updated, we need to validate the new merchant reference.
      if (invoicePayload.MerchantReference is not null &&
          newInvoice.MerchantReference != possibleInvoice.MerchantReference)
      {
        var possibleMerchant = await invoiceProcessingService
          .ReadMerchant(newInvoice.MerchantReference)
          .ConfigureAwait(false);
        if (possibleMerchant is null)
        {
          return TypedResults.BadRequest($"The merchant with id {invoicePayload.MerchantReference} does not exist.");
        }

        if (!possibleMerchant.ReferencedInvoices.Contains(id))
        {
          possibleMerchant.ReferencedInvoices.Add(id);
          await invoiceProcessingService
            .UpdateMerchant(possibleMerchant, possibleMerchant.id, possibleMerchant.ParentCompanyId)
            .ConfigureAwait(false);
        }
      }

      var updatedInvoice = await invoiceProcessingService
        .UpdateInvoice(newInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice patched successfully");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: InvoiceResponseDto.FromInvoice(updatedInvoice));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> DeleteInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("CRUD.Delete");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .DeleteInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice deleted successfully");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> AddProductToInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    CreateProductRequestDto product)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProductToInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Product.Add");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var productEntity = product.ToProduct();
      activity?.SetTag("product.name", productEntity.RawName);

      await invoiceProcessingService
        .AddProduct(productEntity, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Product added to invoice");
      return TypedResults.Accepted(uri: $"/rest/v1/invoices/{id}/products", value: ProductResponseDto.FromProduct(productEntity));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Product.ReadAll");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("result.count", possibleInvoice.Items.Count);
      activity?.RecordSuccess();
      return TypedResults.Ok(possibleInvoice.Items.Select(ProductResponseDto.FromProduct));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RemoveProductFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    DeleteProductRequestDto productDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveProductFromInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Product.Delete");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);
      activity?.SetTag("product.name", productDto.ProductName);

      var possibleProduct = await invoiceProcessingService
        .GetProduct(productDto.ProductName, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleProduct is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .DeleteProduct(productDto.ProductName, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Product removed from invoice");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> UpdateProductInInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateProductRequestDto productInformation)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProductInInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Product.Update");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);
      activity?.SetTag("product.original_name", productInformation.OriginalProductName);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.invoice_found", false);
        return TypedResults.NotFound();
      }

      var possibleProduct = await invoiceProcessingService
        .GetProduct(productInformation.OriginalProductName, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleProduct is null)
      {
        activity?.SetTag("result.product_found", false);
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .DeleteProduct(possibleProduct, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      var updatedProduct = productInformation.ToProduct();
      activity?.SetTag("product.new_name", updatedProduct.RawName);

      await invoiceProcessingService
        .AddProduct(updatedProduct, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Product updated in invoice");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}/products", value: ProductResponseDto.FromProduct(updatedProduct));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveMerchantFromInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Invoice.ReadMerchant");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.invoice_found", false);
        return TypedResults.NotFound();
      }

      if (possibleInvoice.MerchantReference == Guid.Empty)
      {
        activity?.SetTag("result.has_merchant", false);
        return TypedResults.NotFound();
      }

      activity?.SetMerchantContext(possibleInvoice.MerchantReference);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(possibleInvoice.MerchantReference)
        .ConfigureAwait(false);

      if (possibleMerchant is null)
      {
        activity?.SetTag("result.merchant_found", false);
        return TypedResults.NotFound();
      }

      activity?.RecordSuccess();
      return TypedResults.Ok(MerchantResponseDto.FromMerchant(possibleMerchant));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> AddMerchantToInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    AddMerchantToInvoiceRequestDto merchantDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddMerchantToInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Invoice.AddMerchant");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        activity?.SetTag("result.invoice_found", false);
        return TypedResults.NotFound();
      }

      if (possibleInvoice.MerchantReference != Guid.Empty)
      {
        activity?.SetTag("result.conflict", "merchant_exists");
        return TypedResults.Conflict();
      }

      var merchant = merchantDto.ToMerchant();
      activity?.SetMerchantContext(merchant.id, merchant.Name);
      activity?.SetTag("merchant.parent_company_id", merchant.ParentCompanyId.ToString());

      possibleInvoice.MerchantReference = merchant.id;
      merchant.ReferencedInvoices.Add(possibleInvoice.id);

      await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      await invoiceProcessingService
        .CreateMerchant(merchant)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant added to invoice");
      // Return MerchantResponseDto so the client can extract the merchant ID
      return TypedResults.Created(uri: $"/rest/v1/merchants/{merchant.id}", MerchantResponseDto.FromMerchant(merchant));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RemoveMerchantFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveMerchantFromInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Invoice.RemoveMerchant");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.invoice_found", false);
        return TypedResults.NotFound();
      }

      if (possibleInvoice.MerchantReference == Guid.Empty)
      {
        activity?.SetTag("result.conflict", "no_merchant");
        return TypedResults.Conflict();
      }

      activity?.SetMerchantContext(possibleInvoice.MerchantReference);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(possibleInvoice.MerchantReference)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.merchant_found", false);
        return TypedResults.NotFound();
      }

      possibleInvoice.MerchantReference = Guid.Empty;
      possibleMerchant.ReferencedInvoices.Remove(possibleInvoice.id);

      await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      await invoiceProcessingService
        .UpdateMerchant(possibleMerchant, possibleMerchant.id, possibleMerchant.ParentCompanyId)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant removed from invoice");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> CreateInvoiceScanAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    CreateInvoiceScanRequestDto invoiceScanDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScanAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Scan.Create");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      InvoiceScan convertedScan = invoiceScanDto.ToInvoiceScan();
      activity?.SetTag("scan.location", convertedScan.Location.ToString());

      possibleInvoice.Scans.Add(convertedScan);

      await invoiceProcessingService
          .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
          .ConfigureAwait(false);

      activity?.RecordSuccess("Scan added to invoice");
      return TypedResults.Created($"/rest/v1/invoices/{id}/scans", InvoiceScanResponseDto.FromInvoiceScan(convertedScan));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveInvoiceScansAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoiceScansAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Scan.ReadAll");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("result.count", possibleInvoice.Scans.Count);
      activity?.RecordSuccess();
      return TypedResults.Ok(possibleInvoice.Scans.Select(InvoiceScanResponseDto.FromInvoiceScan));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> DeleteInvoiceScanAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    string scanLocationField)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScanAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Scan.Delete");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      // URL-decode the scan location field to handle URL-encoded characters
      var decodedScanLocation = Uri.UnescapeDataString(scanLocationField);
      activity?.SetTag("scan.location", decodedScanLocation);

      var possibleScan = possibleInvoice.Scans
         .FirstOrDefault(scan => scan.Location.ToString() == decodedScanLocation, InvoiceScan.Default());

      if (InvoiceScan.NotDefault(possibleScan))
      {
        possibleInvoice.Scans.Remove(possibleScan);
        await invoiceProcessingService
          .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
          .ConfigureAwait(false);
        activity?.RecordSuccess("Scan removed from invoice");
        return TypedResults.NoContent();
      }

      activity?.SetTag("scan.found", false);
      return TypedResults.NotFound();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveInvoiceMetadataAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoiceMetadataAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Metadata.Read");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("metadata.count", possibleInvoice.AdditionalMetadata.Count);
      activity?.RecordSuccess();
      return TypedResults.Ok(value: possibleInvoice.AdditionalMetadata);
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> PatchInvoiceMetadataAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    PatchMetadataRequestDto invoiceMetadataPatch)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PatchInvoiceMetadataAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Metadata.Patch");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      invoiceMetadataPatch.ApplyTo(possibleInvoice.AdditionalMetadata);

      var updatedInvoice = await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.SetTag("metadata.count", updatedInvoice.AdditionalMetadata.Count);
      activity?.RecordSuccess("Metadata patched");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}/metadata", updatedInvoice.AdditionalMetadata);
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> DeleteInvoiceMetadataAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    DeleteMetadataRequestDto metadataKeys)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceMetadataAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Metadata.Delete");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);
      activity?.SetTag("metadata.keys_to_delete", metadataKeys.Keys.Count());

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      foreach (var key in metadataKeys.Keys)
      {
        possibleInvoice.AdditionalMetadata.Remove(key);
      }

      _ = await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Metadata keys deleted");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  #endregion

  #region CRUD operations for the Merchant Standard Endpoints
  internal static async partial Task<IResult> CreateNewMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    CreateMerchantRequestDto merchantDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Create");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var merchant = merchantDto.ToMerchant();
      activity?.SetMerchantContext(merchant.id);
      activity?.SetTag("merchant.name", merchant.Name);

      await invoiceProcessingService
          .CreateMerchant(merchant)
          .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant created");
      return TypedResults.Created($"/rest/v1/merchants/{merchant.id}", MerchantResponseDto.FromMerchant(merchant));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveAllMerchantsAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid parentCompanyId)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.ReadAll");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetTag("parent_company.id", parentCompanyId.ToString());

      var possibleMerchants = await invoiceProcessingService
          .ReadMerchants(parentCompanyId)
          .ConfigureAwait(false);

      // RESTful convention: return 200 with empty array for collection endpoints, not 404
      var merchantDtos = possibleMerchants?.Select(MerchantResponseDto.FromMerchant) ?? [];
      activity?.SetTag("result.count", merchantDtos.Count());
      activity?.RecordSuccess();
      return TypedResults.Ok(merchantDtos);
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveSpecificMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    Guid? parentCompanyId)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Read");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      if (parentCompanyId.HasValue)
      {
        activity?.SetTag("parent_company.id", parentCompanyId.Value.ToString());
      }

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id, parentCompanyId)
        .ConfigureAwait(false);

      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("merchant.name", possibleMerchant.Name);
      activity?.RecordSuccess();
      return TypedResults.Ok(MerchantResponseDto.FromMerchant(possibleMerchant));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> UpdateSpecificMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateMerchantRequestDto merchantPayload)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Update");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id, merchantPayload.ParentCompanyId)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var updatedMerchant = merchantPayload.ToMerchant(id);
      activity?.SetTag("merchant.name", updatedMerchant.Name);

      await invoiceProcessingService
        .UpdateMerchant(updatedMerchant, id, updatedMerchant.ParentCompanyId)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant updated");
      return TypedResults.Accepted($"/rest/v1/merchants/{id}", MerchantResponseDto.FromMerchant(updatedMerchant));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> DeleteMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    Guid parentCompanyId)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Delete");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      activity?.SetTag("parent_company.id", parentCompanyId.ToString());

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id, parentCompanyId)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("merchant.referenced_invoices_count", possibleMerchant.ReferencedInvoices.Count);

      // Before deleting the merchant, we need to remove the reference from all invoices that reference this merchant.
      foreach (var invoiceIdentifier in possibleMerchant.ReferencedInvoices)
      {
        var possibleInvoice = await invoiceProcessingService
          .ReadInvoice(invoiceIdentifier)
          .ConfigureAwait(false);
        if (possibleInvoice is not null)
        {
          possibleInvoice.MerchantReference = Guid.Empty;
          await invoiceProcessingService
            .UpdateInvoice(possibleInvoice, possibleInvoice.id)
            .ConfigureAwait(false);
        }
      }

      await invoiceProcessingService
        .DeleteMerchant(id, parentCompanyId)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant deleted");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoicesFromMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.ReadInvoices");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var listOfInvoiceIdentifiers = possibleMerchant.ReferencedInvoices;
      activity?.SetTag("merchant.referenced_invoices_count", listOfInvoiceIdentifiers.Count);

      var listOfConcreteInvoices = new List<Invoice>();

      foreach (var identifier in listOfInvoiceIdentifiers)
      {
        var possibleInvoice = await invoiceProcessingService
          .ReadInvoice(identifier)
          .ConfigureAwait(false);
        if (possibleInvoice is not null)
        {
          listOfConcreteInvoices.Add(possibleInvoice);
        }
      }

      activity?.SetTag("result.count", listOfConcreteInvoices.Count);
      activity?.RecordSuccess();
      // RESTful convention: return 200 with empty array for collection endpoints, not 404
      return TypedResults.Ok(listOfConcreteInvoices.Select(InvoiceResponseDto.FromInvoice));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> AddInvoiceToMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantInvoicesRequestDto invoiceIdentifiers)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddInvoiceToMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.AddInvoices");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      activity?.SetTag("invoices.requested_count", invoiceIdentifiers.InvoiceIdentifiers.Count());

      var possibleMerchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var listOfValidInvoices = new HashSet<Invoice>();
      foreach (var identifier in invoiceIdentifiers.InvoiceIdentifiers)
      {
        var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
        if (potentialInvoice is not null)
        {
          listOfValidInvoices.Add(potentialInvoice);
        }
      }

      activity?.SetTag("invoices.valid_count", listOfValidInvoices.Count);

      foreach (var invoice in listOfValidInvoices)
      {
        possibleMerchant.ReferencedInvoices.Add(invoice.id);
        invoice.MerchantReference = possibleMerchant.id;

        await invoiceProcessingService
          .UpdateInvoice(invoice, invoice.id)
          .ConfigureAwait(false);
      }

      await invoiceProcessingService
        .UpdateMerchant(possibleMerchant, possibleMerchant.id, possibleMerchant.ParentCompanyId)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoices added to merchant");
      return TypedResults.Accepted($"/rest/v1/merchants/{id}", MerchantResponseDto.FromMerchant(possibleMerchant));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RemoveInvoiceFromMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantInvoicesRequestDto invoiceIdentifiers)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveInvoiceFromMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.RemoveInvoices");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      activity?.SetTag("invoices.requested_count", invoiceIdentifiers.InvoiceIdentifiers.Count());

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var listOfInvoicesToBeRemoved = new List<Invoice>();
      foreach (var identifier in invoiceIdentifiers.InvoiceIdentifiers)
      {
        var potentialInvoice = await invoiceProcessingService.ReadInvoice(identifier).ConfigureAwait(false);
        if (potentialInvoice is not null)
        {
          listOfInvoicesToBeRemoved.Add(potentialInvoice);
        }
      }

      activity?.SetTag("invoices.removed_count", listOfInvoicesToBeRemoved.Count);

      foreach (var invoice in listOfInvoicesToBeRemoved)
      {
        possibleMerchant.ReferencedInvoices.Remove(invoice.id);
        invoice.MerchantReference = Guid.Empty;

        await invoiceProcessingService
          .UpdateInvoice(invoice, invoice.id)
          .ConfigureAwait(false);
      }

      await invoiceProcessingService
        .UpdateMerchant(possibleMerchant, possibleMerchant.id, possibleMerchant.ParentCompanyId)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoices removed from merchant");
      return TypedResults.NoContent();
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }

  internal static async partial Task<IResult> RetrieveProductsFromMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.ReadProducts");
      }

      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var listOfInvoices = possibleMerchant.ReferencedInvoices;
      activity?.SetTag("merchant.invoices_count", listOfInvoices.Count);

      var listOfProducts = new List<ProductResponseDto>();

      foreach (var identifier in listOfInvoices)
      {
        var potentialInvoice = await invoiceProcessingService
          .ReadInvoice(identifier)
          .ConfigureAwait(false);

        if (potentialInvoice is not null)
        {
          foreach (var product in potentialInvoice.Items)
          {
            listOfProducts.Add(ProductResponseDto.FromProduct(product));
          }
        }
      }

      activity?.SetTag("result.count", listOfProducts.Count);
      activity?.RecordSuccess();
      return TypedResults.Ok(listOfProducts);
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }
  #endregion

  #region Analysis operations
  internal static async partial Task<IResult> AnalyzeInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    AnalyzeInvoiceRequestDto options)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Invoice.Analyze");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      // Set analysis options on the span
      var analysisOptions = options.ToAnalysisOptions();
      activity?.SetTag("analysis.mode", analysisOptions.ToString());

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .AnalyzeInvoice(analysisOptions, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      var analyzedInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      if (analyzedInvoice is null)
      {
        activity?.SetTag("result.analyzed", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("result.items_count", analyzedInvoice.Items.Count);
      activity?.RecordSuccess("Invoice analyzed");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", InvoiceResponseDto.FromInvoice(analyzedInvoice));
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service validation error.");
    }
    catch (InvoiceProcessingServiceDependencyException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency error.");
    }
    catch (InvoiceProcessingServiceDependencyValidationException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service dependency validation error.");
    }
    catch (InvoiceProcessingServiceException exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered a processing service error.");
    }
    catch (Exception exception)
    {
      Activity.Current?.RecordException(exception);
      return TypedResults.Problem(
        detail: exception.Message + exception.Source,
        statusCode: StatusCodes.Status500InternalServerError,
        title: "The service encountered an unexpected internal service error.");
    }
  }
  #endregion
}

