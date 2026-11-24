namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Http;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Domain.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Categories;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Services.Management;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using static arolariu.Backend.Common.GuidConstants;
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public static partial class InvoiceEndpoints
{
  #region CRUD operations for the Invoice Standard Endpoints
  internal static async partial Task<IResult> CreateNewInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    CreateInvoiceRequestDto invoiceDto)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewInvoiceAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("CRUD.Create");

      var invoice = invoiceDto.ToInvoice();
      activity?.SetInvoiceContext(invoice.id, invoice.UserIdentifier);

      await invoiceManagementService
        .CreateInvoice(invoice, invoice.UserIdentifier, writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice created successfully");
      var responseDto = InvoiceResponseDto.FromInvoice(invoice);
      return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", responseDto);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "create", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
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
        possibleInvoice = await invoiceManagementService
          .ReadInvoice(id, potentialUserIdentifier, cancellationToken)
          .ConfigureAwait(false);
      }

      // Step 2: If not found (or guest), try cross-partition read (shared/public scenario)
      possibleInvoice ??= await invoiceManagementService
          .ReadInvoice(id, userIdentifier: null, cancellationToken)
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
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveAllInvoicesAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    CancellationToken cancellationToken)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("CRUD.ReadAll");

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetUserContext(potentialUserIdentifier);

      var possibleInvoices = await invoiceManagementService
        .ReadInvoices(potentialUserIdentifier, cancellationToken)
        .ConfigureAwait(false);

      activity?.SetTag("result.count", possibleInvoices?.Count() ?? 0);
      activity?.RecordSuccess();

      return possibleInvoices is null ? TypedResults.NotFound() : TypedResults.Ok(possibleInvoices.Select(InvoiceResponseDto.FromInvoice));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> DeleteInvoicesAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext
    )
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      await invoiceManagementService
        .DeleteInvoices(potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("All invoices deleted successfully");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> UpdateSpecificInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateInvoiceRequestDto invoicePayload)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("CRUD.Update");
      }

      if (!CategorySelection.IsValid<InvoiceCategory>(invoicePayload.Category))
      {
        return TypedResults.BadRequest("The category must be an invoice category ID or -1 to clear.");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var updatedInvoiceEntity = invoicePayload.ToInvoice(id, potentialUserIdentifier, possibleInvoice.Category);
      updatedInvoiceEntity.StorageETag = possibleInvoice.StorageETag;
      if (updatedInvoiceEntity.MerchantReference != Guid.Empty
          && updatedInvoiceEntity.MerchantReference != possibleInvoice.MerchantReference
          && await invoiceManagementService.ReadMerchant(updatedInvoiceEntity.MerchantReference, null, writeScope.Token).ConfigureAwait(false) is null)
      {
        return TypedResults.BadRequest("The referenced merchant does not exist.");
      }

      // Preserve scans from the original invoice (scans are managed through dedicated endpoints)
      foreach (var scan in possibleInvoice.Scans)
      {
        updatedInvoiceEntity.Scans.Add(scan);
      }

      // Preserve recipes when not explicitly supplied; an explicit empty array clears the collection
      if (invoicePayload.PossibleRecipes is null)
      {
        foreach (var recipe in possibleInvoice.PossibleRecipes)
        {
          updatedInvoiceEntity.PossibleRecipes.Add(recipe);
        }
      }

      // Product lines are not part of this write DTO.
      updatedInvoiceEntity.Items = possibleInvoice.Items;
      updatedInvoiceEntity.ReceiptType = possibleInvoice.ReceiptType;
      updatedInvoiceEntity.CountryRegion = possibleInvoice.CountryRegion;
      updatedInvoiceEntity.TaxDetails = possibleInvoice.TaxDetails;
      updatedInvoiceEntity.Payments = possibleInvoice.Payments;

      var updatedInvoice = await invoiceManagementService
        .UpdateInvoice(
          id,
          potentialUserIdentifier,
          updatedInvoiceEntity,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice updated successfully");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: InvoiceResponseDto.FromInvoice(updatedInvoice));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> PatchSpecificInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    PatchInvoiceRequestDto invoicePayload)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PatchSpecificInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("CRUD.Patch");
      }

      if (!CategorySelection.IsValid<InvoiceCategory>(invoicePayload.Category))
      {
        return TypedResults.BadRequest("The category must be an invoice category ID or -1 to clear.");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
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
        var possibleMerchant = await invoiceManagementService
          .ReadMerchant(newInvoice.MerchantReference, null, writeScope.Token)
          .ConfigureAwait(false);
        if (possibleMerchant is null)
        {
          return TypedResults.BadRequest($"The merchant with id {invoicePayload.MerchantReference} does not exist.");
        }
      }

      var updatedInvoice = await invoiceManagementService
        .UpdateInvoice(
          id,
          potentialUserIdentifier,
          newInvoice,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice patched successfully");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: InvoiceResponseDto.FromInvoice(updatedInvoice));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> DeleteInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      await invoiceManagementService
        .DeleteInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Invoice deleted successfully");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> AddProductToInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CreateProductRequestDto product)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProductToInvoiceAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Product.Add");
      }

      var productEntity = product.ToProduct();

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      await invoiceManagementService
        .AddProduct(
          id,
          potentialUserIdentifier,
          productEntity,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Product added to invoice");
      return TypedResults.Created(uri: $"/rest/v1/invoices/{id}/products", value: ProductResponseDto.FromProduct(productEntity));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "create", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken)
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
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RemoveProductFromInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    DeleteProductRequestDto productDto)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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
      await invoiceManagementService
        .DeleteProduct(
          id,
          potentialUserIdentifier,
          productDto.ProductName,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Product removed from invoice");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> UpdateProductInInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateProductRequestDto productInformation)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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
      if (!productInformation.IsValid)
      {
        return TypedResults.BadRequest("Provide a product name and category, or complete product details.");
      }

      var saved = await invoiceManagementService
        .UpdateProduct(id, potentialUserIdentifier, productInformation, writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Product updated in invoice");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}/products", value: ProductResponseDto.FromProduct(saved));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken)
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

      var possibleMerchant = await invoiceManagementService
        .ReadMerchant(possibleInvoice.MerchantReference, null, cancellationToken)
        .ConfigureAwait(false);

      if (possibleMerchant is null)
      {
        activity?.SetTag("result.merchant_found", false);
        return TypedResults.NotFound();
      }

      activity?.RecordSuccess();
      return TypedResults.Ok(MerchantResponseDto.FromMerchantForCaller(
        possibleMerchant,
        potentialUserIdentifier,
        [possibleInvoice.id]));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> AddMerchantToInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    AddMerchantToInvoiceRequestDto merchantDto)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
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

      if (merchantDto.Category is null)
      {
        return TypedResults.BadRequest("A merchant category is required.");
      }

      var merchant = merchantDto.ToMerchant();
      activity?.SetMerchantContext(merchant.id);
      activity?.SetTag("merchant.parent_company_id", merchant.ParentCompanyId.ToString());

      await invoiceManagementService
        .CreateMerchant(merchant, null, writeScope.Token)
        .ConfigureAwait(false);

      possibleInvoice.MerchantReference = merchant.id;
      await invoiceManagementService
        .UpdateInvoice(
          id,
          potentialUserIdentifier,
          possibleInvoice,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant added to invoice");
      return TypedResults.Created($"/rest/v1/merchants/{merchant.id}",
        MerchantResponseDto.FromMerchantForCaller(merchant, potentialUserIdentifier, [id]));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "create", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RemoveMerchantFromInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
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

      possibleInvoice.MerchantReference = Guid.Empty;

      await invoiceManagementService
        .UpdateInvoice(
          id,
          potentialUserIdentifier,
          possibleInvoice,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant removed from invoice");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> AttachInvoiceScanAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    AttachInvoiceScanRequestDto invoiceScanDto)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AttachInvoiceScanAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Scan.Create");
      }

      InvoiceScan convertedScan = invoiceScanDto.ToInvoiceScan();
      activity?.SetTag("scan.type", convertedScan.Type.ToString());

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      await invoiceManagementService
        .AttachInvoiceScan(id, potentialUserIdentifier, convertedScan, writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Scan added to invoice");
      return TypedResults.Created($"/rest/v1/invoices/{id}/scans", InvoiceScanResponseDto.FromInvoiceScan(convertedScan));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "create", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveInvoiceScansAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken)
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
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> DeleteInvoiceScanAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    string scanLocationField)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      // URL-decode the scan location field to handle URL-encoded characters.
      var decodedScanLocation = Uri.UnescapeDataString(scanLocationField);

      var possibleScan = possibleInvoice.Scans
         .FirstOrDefault(scan => scan.Location.ToString() == decodedScanLocation, InvoiceScan.Default());

      if (InvoiceScan.NotDefault(possibleScan))
      {
        possibleInvoice.Scans.Remove(possibleScan);
        await invoiceManagementService
          .UpdateInvoice(
            id,
            potentialUserIdentifier,
            possibleInvoice,
            cancellationToken: writeScope.Token)
          .ConfigureAwait(false);
        activity?.RecordSuccess("Scan removed from invoice");
        return TypedResults.NoContent();
      }

      activity?.SetTag("scan.found", false);
      return TypedResults.NotFound();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveInvoiceMetadataAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken)
        .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var publicMetadata = InvoiceResponseDto.CreateMetadataSnapshot(possibleInvoice.AdditionalMetadata);
      activity?.SetTag("metadata.count", publicMetadata.Count);
      activity?.RecordSuccess();
      return TypedResults.Ok(value: publicMetadata);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> PatchInvoiceMetadataAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    PatchMetadataRequestDto invoiceMetadataPatch)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PatchInvoiceMetadataAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Metadata.Patch");
      }

      invoiceMetadataPatch.Validate();

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, potentialUserIdentifier);

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      invoiceMetadataPatch.ApplyTo(possibleInvoice.AdditionalMetadata);

      var updatedInvoice = await invoiceManagementService
        .UpdateInvoice(
          id,
          potentialUserIdentifier,
          possibleInvoice,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      var publicMetadata = InvoiceResponseDto.CreateMetadataSnapshot(updatedInvoice.AdditionalMetadata);
      activity?.SetTag("metadata.count", publicMetadata.Count);
      activity?.RecordSuccess("Metadata patched");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}/metadata", publicMetadata);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> DeleteInvoiceMetadataAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    DeleteMetadataRequestDto metadataKeys)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken: writeScope.Token)
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

      _ = await invoiceManagementService
        .UpdateInvoice(
          id,
          potentialUserIdentifier,
          possibleInvoice,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Metadata keys deleted");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "invoice");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  #endregion

  #region CRUD operations for the Merchant Standard Endpoints
  internal static async partial Task<IResult> CreateNewMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    CreateMerchantRequestDto merchantDto)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateNewMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Create");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var merchant = merchantDto.ToMerchant();
      activity?.SetMerchantContext(merchant.id);

      await invoiceManagementService
          .CreateMerchant(merchant, null, writeScope.Token)
          .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant created");
      return TypedResults.Created($"/rest/v1/merchants/{merchant.id}",
        MerchantResponseDto.FromMerchantForCaller(merchant, userIdentifier, []));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "create", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  /// <summary>Determines whether a merchant collection request may be served for the requested user.</summary>
  /// <remarks>
  /// <para>An absent <paramref name="visibleToUser"/> implies the caller. A present value must equal the
  /// caller; otherwise the request is an attempt to enumerate another user's merchants.</para>
  /// </remarks>
  /// <param name="caller">The user identifier resolved from the request principal.</param>
  /// <param name="visibleToUser">The optional user identifier supplied on the query string.</param>
  /// <returns><see langword="true"/> when the request is authorised; otherwise <see langword="false"/>.</returns>
  internal static bool IsMerchantCollectionRequestAuthorized(Guid caller, Guid? visibleToUser) =>
    visibleToUser is null || visibleToUser.Value == caller;

  internal static async partial Task<IResult> RetrieveAllMerchantsAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid? parentCompanyId,
    Guid? visibleToUser,
    CancellationToken cancellationToken)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.ReadAll");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      if (!IsMerchantCollectionRequestAuthorized(userIdentifier, visibleToUser))
      {
        activity?.SetTag("merchant.scope", "forbidden");
        return TypedResults.Forbid();
      }

      // Owner scoping is applied unconditionally. parentCompanyId narrows the caller's own
      // visible set; it is deliberately NOT an alternate path that skips the ownership filter.
      // Treating it as one would let any authenticated caller enumerate a partition and read
      // other users' referencedInvoiceIds and createdBy values out of MerchantResponseDto.
      var visibility = await invoiceManagementService
        .ReadMerchantsVisibleToUser(userIdentifier, cancellationToken)
        .ConfigureAwait(false);
      IEnumerable<Merchant> possibleMerchants = visibility.Merchants;
      IReadOnlyCollection<Invoice> callerInvoices = visibility.Invoices;

      if (parentCompanyId.HasValue)
      {
        activity?.SetTag("merchant.scope", "visible_to_user.parent_company");
        activity?.SetTag("parent_company.id", parentCompanyId.Value.ToString());
        possibleMerchants = possibleMerchants
          .Where(merchant => merchant.ParentCompanyId == parentCompanyId.Value);
      }
      else
      {
        activity?.SetTag("merchant.scope", "visible_to_user");
      }

      // RESTful convention: return 200 with empty array for collection endpoints, not 404
      var identifiersByMerchant = callerInvoices.ToLookup(invoice => invoice.MerchantReference, invoice => invoice.id);
      var merchantDtos = possibleMerchants.Select(merchant => MerchantResponseDto.FromMerchantForCaller(
        merchant, userIdentifier, identifiersByMerchant[merchant.id].ToArray())).ToArray();
      activity?.SetTag("result.count", merchantDtos.Length);
      activity?.RecordSuccess();
      return TypedResults.Ok(merchantDtos);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveSpecificMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    Guid? parentCompanyId,
    CancellationToken cancellationToken)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Read");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      if (parentCompanyId.HasValue)
      {
        activity?.SetTag("parent_company.id", parentCompanyId.Value.ToString());
      }

      var merchantWithInvoices = await ReadMerchantWithCallerInvoicesAsync(invoiceManagementService, id, userIdentifier, parentCompanyId, cancellationToken)
        .ConfigureAwait(false);
      if (merchantWithInvoices is not { } related)
      {
        activity?.SetTag("access.granted", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("access.granted", true);
      activity?.RecordSuccess();
      return TypedResults.Ok(MerchantResponseDto.FromMerchantForCaller(
        related.Merchant,
        userIdentifier,
        related.Invoices.Select(invoice => invoice.id).ToArray()));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> UpdateSpecificMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateMerchantRequestDto merchantPayload)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Update");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);

      var merchantWithInvoices = await ReadMerchantWithCallerInvoicesAsync(invoiceManagementService, id, userIdentifier, null, writeScope.Token)
        .ConfigureAwait(false);
      if (merchantWithInvoices is not { } related)
      {
        activity?.SetTag("access.granted", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("access.granted", true);
      if (!merchantPayload.IsValid)
      {
        return TypedResults.BadRequest("Provide a category alone or complete merchant details.");
      }

      merchantPayload.ApplyTo(related.Merchant);
      Merchant persistedMerchant = await invoiceManagementService
        .UpdateMerchant(
          id,
          related.Merchant.ParentCompanyId,
          related.Merchant,
          cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant updated");
      return TypedResults.Accepted($"/rest/v1/merchants/{id}", MerchantResponseDto.FromMerchantForCaller(
        persistedMerchant, userIdentifier, related.Invoices.Select(invoice => invoice.id).ToArray()));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> DeleteMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    Guid parentCompanyId)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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

      var possibleMerchant = await invoiceManagementService
        .ReadMerchant(id, parentCompanyId, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      await invoiceManagementService
        .DeleteMerchant(id, parentCompanyId, cancellationToken: writeScope.Token)
        .ConfigureAwait(false);

      activity?.RecordSuccess("Merchant deleted");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "delete", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoicesFromMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.ReadInvoices");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);

      var merchantWithInvoices = await ReadMerchantWithCallerInvoicesAsync(invoiceManagementService, id, userIdentifier, null, cancellationToken)
        .ConfigureAwait(false);
      if (merchantWithInvoices is not { } related)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("result.count", related.Invoices.Length);
      activity?.RecordSuccess();
      return TypedResults.Ok(related.Invoices.Select(InvoiceResponseDto.FromInvoice));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> AddInvoiceToMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantInvoicesRequestDto invoiceIdentifiers)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddInvoiceToMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.AddInvoices");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      var requested = invoiceIdentifiers.InvoiceIdentifiers?.ToHashSet();
      if (requested is null || requested.Count == 0)
      {
        return TypedResults.BadRequest("Provide at least one invoice identifier.");
      }
      if (userIdentifier == Guid.Empty) return TypedResults.NotFound();
      activity?.SetTag("invoices.requested_count", requested.Count);

      var ownedInvoices = (await invoiceManagementService.ReadInvoices(userIdentifier, writeScope.Token).ConfigureAwait(false)).ToArray();
      var selected = ownedInvoices.Where(invoice => requested.Contains(invoice.id)).ToArray();
      if (selected.Length == 0) return TypedResults.NotFound();

      var possibleMerchant = await invoiceManagementService.ReadMerchant(id, null, writeScope.Token).ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      activity?.SetTag("invoices.valid_count", selected.Length);

      foreach (var invoice in selected.Where(invoice => invoice.MerchantReference != id))
      {
        invoice.MerchantReference = id;

        await invoiceManagementService
          .UpdateInvoice(
            invoice.id,
            userIdentifier,
            invoice,
            writeScope.Token)
          .ConfigureAwait(false);
      }

      activity?.RecordSuccess("Invoices added to merchant");
      var linkedIds = ownedInvoices.Where(invoice => invoice.MerchantReference == id).Select(invoice => invoice.id).ToArray();
      return TypedResults.Accepted($"/rest/v1/merchants/{id}",
        MerchantResponseDto.FromMerchantForCaller(possibleMerchant, userIdentifier, linkedIds));
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RemoveInvoiceFromMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantInvoicesRequestDto invoiceIdentifiers)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveInvoiceFromMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.RemoveInvoices");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      var requested = invoiceIdentifiers.InvoiceIdentifiers?.ToHashSet();
      if (requested is null || requested.Count == 0)
      {
        return TypedResults.BadRequest("Provide at least one invoice identifier.");
      }
      activity?.SetTag("invoices.requested_count", requested.Count);

      var merchantWithInvoices = await ReadMerchantWithCallerInvoicesAsync(invoiceManagementService, id, userIdentifier, null, writeScope.Token)
        .ConfigureAwait(false);
      if (merchantWithInvoices is not { } related)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var selected = related.Invoices.Where(invoice => requested.Contains(invoice.id)).ToArray();
      activity?.SetTag("invoices.removed_count", selected.Length);

      foreach (var invoice in selected)
      {
        invoice.MerchantReference = Guid.Empty;

        await invoiceManagementService
          .UpdateInvoice(
            invoice.id,
            userIdentifier,
            invoice,
            writeScope.Token)
          .ConfigureAwait(false);
      }

      activity?.RecordSuccess("Invoices removed from merchant");
      return TypedResults.NoContent();
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "update", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }

  internal static async partial Task<IResult> RetrieveProductsFromMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.ReadProducts");
      }

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);

      var merchantWithInvoices = await ReadMerchantWithCallerInvoicesAsync(invoiceManagementService, id, userIdentifier, null, cancellationToken)
        .ConfigureAwait(false);
      if (merchantWithInvoices is not { } related)
      {
        activity?.SetTag("result.found", false);
        return TypedResults.NotFound();
      }

      var products = related.Invoices.SelectMany(invoice => invoice.Items).Select(ProductResponseDto.FromProduct).ToArray();

      activity?.SetTag("result.count", products.Length);
      activity?.RecordSuccess();
      return TypedResults.Ok(products);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, null, "read", "merchant");
    }
    catch (Exception ex)
    {
      Activity.Current?.RecordException(ex);
      Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
      return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
    }
  }
  #endregion

  internal static async partial Task<IResult> AnalyzeInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    InvoiceAnalysisRequestDto request)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("Invoice.Analyze");

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetInvoiceContext(id, userIdentifier);
      activity?.SetTag("analysis.profile", request.Profile.ToString());

      string messageId = await invoiceManagementService
        .QueueInvoiceAnalysisAsync(id, userIdentifier, request, writeScope.Token)
        .ConfigureAwait(false);

      activity?.SetTag("analysis.message_id", messageId);
      activity?.RecordSuccess("Invoice analysis message queued");
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", messageId);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "analyze", "invoice");
    }
    catch (Exception exception)
    {
      Activity.Current?.SetStatus(ActivityStatusCode.Error, "analysis_failure");
      return ExceptionToHttpResultMapper.ToHttpResult(exception, Activity.Current);
    }
  }

  internal static async partial Task<IResult> AnalyzeMerchantAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantAnalysisRequestDto request)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeMerchantAsync), ActivityKind.Server);
      activity?
        .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
        .SetOperationType("Merchant.Analyze");

      Guid userIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      activity?.SetTag("analysis.profile", request.Profile.ToString());

      string messageId = await invoiceManagementService
        .QueueMerchantAnalysisAsync(id, userIdentifier, request, writeScope.Token)
        .ConfigureAwait(false);

      activity?.SetTag("analysis.message_id", messageId);
      activity?.RecordSuccess("Merchant analysis message queued");
      return TypedResults.Accepted($"/rest/v1/merchants/{id}", messageId);
    }
    catch (OperationCanceledException)
    {
      return HandleCancellation(httpContext.HttpContext!, writeScope, "analyze", "merchant");
    }
    catch (Exception exception)
    {
      Activity.Current?.SetStatus(ActivityStatusCode.Error, "analysis_failure");
      return ExceptionToHttpResultMapper.ToHttpResult(exception, Activity.Current);
    }
  }
}
