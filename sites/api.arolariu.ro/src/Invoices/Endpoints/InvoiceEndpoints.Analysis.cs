namespace arolariu.Backend.Domain.Invoices.Endpoints;

using System;
using System.Diagnostics;
using System.Threading.Tasks;

using arolariu.Backend.Common.Http;
using arolariu.Backend.Common.Telemetry.Tracing;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using Microsoft.AspNetCore.Http;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Analysis-pipeline endpoint handlers, kept in their own partial so the analysis coverage gate can scope to the
/// analysis surface without dragging in the unrelated CRUD handlers that share the endpoint class.
/// </summary>
public static partial class InvoiceEndpoints
{
  internal static async partial Task<IResult> AnalyzeInvoiceAsync(
    IAnalysisProcessingService analysisProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    AnalyzeInvoiceRequestDto request)
  {
    // Enqueueing is an ordinary durable write, not an analysis: the long analysis budget belongs to the worker,
    // not to the request thread.
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

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
      activity?.SetTag("analysis.profile", request.Profile.ToString());

      var acceptedRun = await analysisProcessingService
        .QueueInvoiceAnalysisAsync(id, potentialUserIdentifier, request, writeScope.Token)
        .ConfigureAwait(false);

      activity?.SetTag("analysis.run_id", acceptedRun.RunId.ToString());
      activity?.RecordSuccess("Invoice analysis run queued");

      // The Location header points at the analyzed target, because the target is what the client polls for the
      // eventually applied outcome.
      return TypedResults.Accepted($"/rest/v1/invoices/{id}", acceptedRun);
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
    IAnalysisProcessingService analysisProcessingService,
    IHttpContextAccessor httpContext,
    Guid id,
    AnalyzeMerchantRequestDto request)
  {
    using var writeScope = RequestCancellation.ForWrite(
      httpContext.HttpContext!,
      RequestCancellation.CrudWriteBudget);

    try
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeMerchantAsync), ActivityKind.Server);
      if (activity is not null)
      {
        activity.SetLayerContext("Endpoint", nameof(InvoiceEndpoints));
        activity.SetOperationType("Merchant.Analyze");
      }

      var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
      activity?.SetMerchantContext(id);
      activity?.SetTag("analysis.profile", request.Profile.ToString());

      var acceptedRun = await analysisProcessingService
        .QueueMerchantAnalysisAsync(id, potentialUserIdentifier, request, writeScope.Token)
        .ConfigureAwait(false);

      activity?.SetTag("analysis.run_id", acceptedRun.RunId.ToString());
      activity?.RecordSuccess("Merchant analysis run queued");

      return TypedResults.Accepted($"/rest/v1/merchants/{id}", acceptedRun);
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
