namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices.Exceptions.Outer.Processing;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DTOs.Requests;
using arolariu.Backend.Domain.Invoices.DTOs.Responses;
using arolariu.Backend.Domain.Invoices.Services.Processing;

using Microsoft.AspNetCore.Http;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

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
      var invoice = invoiceDto.ToInvoice();

      await invoiceProcessingService
        .CreateInvoice(invoice)
        .ConfigureAwait(false);

      var responseDto = InvoiceDetailDto.FromInvoice(invoice);
      return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", responseDto);
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

  internal static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      return possibleInvoice is null ? TypedResults.NotFound() : TypedResults.Ok(InvoiceDetailDto.FromInvoice(possibleInvoice));
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

  internal static async partial Task<IResult> RetrieveAllInvoicesAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext
    )
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllInvoicesAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoices = await invoiceProcessingService
        .ReadInvoices(potentialUserIdentifier)
        .ConfigureAwait(false);

      return possibleInvoices is null ? TypedResults.NotFound() : TypedResults.Ok(possibleInvoices.Select(InvoiceSummaryDto.FromInvoice));
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
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      await invoiceProcessingService
        .DeleteInvoices(potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.NoContent();
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

  internal static async partial Task<IResult> UpdateSpecificInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateInvoiceDto invoicePayload)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      var updatedInvoiceEntity = invoicePayload.ToInvoice(id, potentialUserIdentifier);
      var updatedInvoice = await invoiceProcessingService
        .UpdateInvoice(updatedInvoiceEntity, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: InvoiceDetailDto.FromInvoice(updatedInvoice));
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

  internal static async partial Task<IResult> PatchSpecificInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    PatchInvoiceDto invoicePayload)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PatchSpecificInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      var newInvoice = invoicePayload.ApplyTo(possibleInvoice);

      // If the merchant reference was updated, we need to validate the new merchant reference.
      if (newInvoice.MerchantReference != possibleInvoice.MerchantReference)
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

      return TypedResults.Accepted($"/rest/v1/invoices/{id}", value: InvoiceDetailDto.FromInvoice(updatedInvoice));
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

  internal static async partial Task<IResult> DeleteInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .DeleteInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.NoContent();
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

  internal static async partial Task<IResult> AddProductToInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    CreateProductRequestDto product)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProductToInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      var productEntity = product.ToProduct();
      await invoiceProcessingService
        .AddProduct(productEntity, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.Accepted(uri: $"/rest/v1/invoices/{id}/products", value: ProductDto.FromProduct(productEntity));
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

  internal static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return possibleInvoice is null ? TypedResults.NotFound() : TypedResults.Ok(possibleInvoice.Items.Select(ProductDto.FromProduct));
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

  internal static async partial Task<IResult> RemoveProductFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    DeleteProductDto productDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveProductFromInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleProduct = await invoiceProcessingService
        .GetProduct(productDto.ProductName, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleProduct is null)
      {
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .DeleteProduct(productDto.ProductName, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.NoContent();
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

  internal static async partial Task<IResult> UpdateProductInInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateProductDto productInformation)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProductInInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      var possibleProduct = await invoiceProcessingService
        .GetProduct(productInformation.OriginalProductName, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleProduct is null)
      {
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .DeleteProduct(possibleProduct, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      var updatedProduct = productInformation.ToProduct();
      await invoiceProcessingService
        .AddProduct(updatedProduct, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      return TypedResults.Accepted($"/rest/v1/invoices/{id}/products", value: ProductDto.FromProduct(updatedProduct));
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

  internal static async partial Task<IResult> RetrieveMerchantFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveMerchantFromInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      if (possibleInvoice.MerchantReference == Guid.Empty)
      {
        return TypedResults.NotFound();
      }

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(possibleInvoice.MerchantReference)
        .ConfigureAwait(false);
      return possibleMerchant is null ? TypedResults.NotFound() : TypedResults.Ok(MerchantDto.FromMerchant(possibleMerchant));
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

  internal static async partial Task<IResult> AddMerchantToInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    AddMerchantToInvoiceDto merchantDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddMerchantToInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);

      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      if (possibleInvoice.MerchantReference != Guid.Empty)
      {
        return TypedResults.Conflict();
      }

      var merchant = merchantDto.ToMerchant();
      possibleInvoice.MerchantReference = merchant.id;
      merchant.ReferencedInvoices.Add(possibleInvoice.id);

      await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);

      await invoiceProcessingService
        .CreateMerchant(merchant)
        .ConfigureAwait(false);

      return TypedResults.Created(uri: $"/rest/v1/merchants/{merchant.id}", InvoiceDetailDto.FromInvoice(possibleInvoice));
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

  internal static async partial Task<IResult> RemoveMerchantFromInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveMerchantFromInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);


      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      if (possibleInvoice.MerchantReference == Guid.Empty)
      {
        return TypedResults.Conflict();
      }

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(possibleInvoice.MerchantReference)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
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

      return TypedResults.NoContent();
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

  internal static async partial Task<IResult> CreateInvoiceScanAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    CreateInvoiceScanRequestDto invoiceScanDto)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScanAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      InvoiceScan convertedScan = invoiceScanDto.ToInvoiceScan();
      possibleInvoice.Scans.Add(convertedScan);

      await invoiceProcessingService
          .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
          .ConfigureAwait(false);

      return TypedResults.Created($"/rest/v1/invoices/{id}/scans", InvoiceScanDto.FromInvoiceScan(convertedScan));
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

  internal static async partial Task<IResult> RetrieveInvoiceScansAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoiceScansAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return possibleInvoice is null ? TypedResults.NotFound() : TypedResults.Ok(possibleInvoice.Scans.Select(InvoiceScanDto.FromInvoiceScan));
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

  internal static async partial Task<IResult> DeleteInvoiceScanAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    string scanLocationField)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScanAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      var possibleScan = possibleInvoice.Scans
         .FirstOrDefault(scan => scan.Location.ToString() == scanLocationField, InvoiceScan.Default());

      if (InvoiceScan.NotDefault(possibleScan))
      {
        possibleInvoice.Scans.Remove(possibleScan);
        return TypedResults.NoContent();
      }

      return TypedResults.NotFound();

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

  internal static async partial Task<IResult> RetrieveInvoiceMetadataAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoiceMetadataAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return possibleInvoice is null ? TypedResults.NotFound() : TypedResults.Ok(value: possibleInvoice.AdditionalMetadata);
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

  internal static async partial Task<IResult> PatchInvoiceMetadataAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    PatchMetadataDto invoiceMetadataPatch)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PatchInvoiceMetadataAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      invoiceMetadataPatch.ApplyTo(possibleInvoice.AdditionalMetadata);

      var updatedInvoice = await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.Accepted($"/rest/v1/invoices/{id}/metadata", updatedInvoice.AdditionalMetadata);
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

  internal static async partial Task<IResult> DeleteInvoiceMetadataAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    DeleteMetadataDto metadataKeys)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceMetadataAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      foreach (var key in metadataKeys.Keys)
      {
        possibleInvoice.AdditionalMetadata.Remove(key);
      }

      _ = await invoiceProcessingService
        .UpdateInvoice(possibleInvoice, id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return TypedResults.NoContent();
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
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var merchant = merchantDto.ToMerchant();
      await invoiceProcessingService
          .CreateMerchant(merchant)
          .ConfigureAwait(false);
      return TypedResults.Created($"/rest/v1/merchants/{merchant.id}", MerchantDto.FromMerchant(merchant));
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

  internal static async partial Task<IResult> RetrieveAllMerchantsAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid parentCompanyId)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveAllMerchantsAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchants = await invoiceProcessingService
          .ReadMerchants(parentCompanyId)
          .ConfigureAwait(false);

      return possibleMerchants is null || !possibleMerchants.Any() ? TypedResults.NotFound() : TypedResults.Ok(possibleMerchants);
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

  internal static async partial Task<IResult> RetrieveSpecificMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    Guid? parentCompanyId)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveSpecificMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id, parentCompanyId)
        .ConfigureAwait(false);
      return possibleMerchant is null ? TypedResults.NotFound() : TypedResults.Ok(possibleMerchant);
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

  internal static async partial Task<IResult> UpdateSpecificMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    UpdateMerchantDto merchantPayload)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateSpecificMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id, merchantPayload.ParentCompanyId)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        return TypedResults.NotFound();
      }

      var updatedMerchant = merchantPayload.ToMerchant(id);
      await invoiceProcessingService
        .UpdateMerchant(updatedMerchant, id)
        .ConfigureAwait(false);
      return TypedResults.Accepted($"/rest/v1/merchants/{id}", MerchantDto.FromMerchant(updatedMerchant));
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

  internal static async partial Task<IResult> DeleteMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    Guid parentCompanyId)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id, parentCompanyId)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        return TypedResults.NotFound();
      }

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
      return TypedResults.NoContent();
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

  internal static async partial Task<IResult> RetrieveInvoicesFromMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveInvoicesFromMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        return TypedResults.NotFound();
      }

      var listOfInvoiceIdentifiers = possibleMerchant.ReferencedInvoices;
      var listOfConcreteInvoices = new List<Invoice>();

      foreach (var identifier in listOfInvoiceIdentifiers)
      {
        var possibleInvoice = await invoiceProcessingService
          .ReadInvoice(identifier)
          .ConfigureAwait(false);
        listOfConcreteInvoices.Add(possibleInvoice);
      }

      return listOfConcreteInvoices.Count == 0 ? TypedResults.NotFound() : TypedResults.Ok(listOfConcreteInvoices);
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

  internal static async partial Task<IResult> AddInvoiceToMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantInvoicesDto invoiceIdentifiers)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddInvoiceToMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService.ReadMerchant(id).ConfigureAwait(false);
      if (possibleMerchant is null)
      {
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

      foreach (var invoice in listOfValidInvoices)
      {
        possibleMerchant.ReferencedInvoices.Add(invoice.id);
        invoice.MerchantReference = possibleMerchant.id;

        await invoiceProcessingService
          .UpdateInvoice(invoice, invoice.id)
          .ConfigureAwait(false);
      }

      await invoiceProcessingService
        .UpdateMerchant(possibleMerchant, possibleMerchant.id)
        .ConfigureAwait(false);

      return TypedResults.Accepted($"/rest/v1/merchants/{id}", MerchantDto.FromMerchant(possibleMerchant));
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

  internal static async partial Task<IResult> RemoveInvoiceFromMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    MerchantInvoicesDto invoiceIdentifiers)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RemoveInvoiceFromMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
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

      foreach (var invoice in listOfInvoicesToBeRemoved)
      {
        possibleMerchant.ReferencedInvoices.Remove(invoice.id);
        invoice.MerchantReference = Guid.Empty;

        await invoiceProcessingService
          .UpdateInvoice(invoice, invoice.id)
          .ConfigureAwait(false);
      }

      await invoiceProcessingService
        .UpdateMerchant(possibleMerchant, possibleMerchant.id)
        .ConfigureAwait(false);
      return TypedResults.NoContent();
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

  internal static async partial Task<IResult> RetrieveProductsFromMerchantAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(RetrieveProductsFromMerchantAsync), ActivityKind.Server);
      _ = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleMerchant = await invoiceProcessingService
        .ReadMerchant(id)
        .ConfigureAwait(false);
      if (possibleMerchant is null)
      {
        return TypedResults.NotFound();
      }

      var listOfInvoices = possibleMerchant.ReferencedInvoices;
      var listOfProducts = new List<Product>();

      foreach (var identifier in listOfInvoices)
      {
        var potentialInvoice = await invoiceProcessingService
          .ReadInvoice(identifier)
          .ConfigureAwait(false);

        if (potentialInvoice is not null)
        {
          foreach (var product in potentialInvoice.Items)
          {
            listOfProducts.Add(product);
          }
        }
      }

      return TypedResults.Ok(listOfProducts);
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
  #endregion

  #region Analysis operations
  internal static async partial Task<IResult> AnalyzeInvoiceAsync(
    IInvoiceProcessingService invoiceProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    AnalyzeInvoiceDto options)
  {
    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoiceAsync), ActivityKind.Server);
      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);

      var possibleInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      if (possibleInvoice is null)
      {
        return TypedResults.NotFound();
      }

      await invoiceProcessingService
        .AnalyzeInvoice(options.ToAnalysisOptions(), id, potentialUserIdentifier)
        .ConfigureAwait(false);

      var analyzedInvoice = await invoiceProcessingService
        .ReadInvoice(id, potentialUserIdentifier)
        .ConfigureAwait(false);
      return analyzedInvoice is null
        ? TypedResults.NotFound()
        : TypedResults.Accepted($"/rest/v1/invoices/{id}", InvoiceDetailDto.FromInvoice(analyzedInvoice));
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
  #endregion
}

