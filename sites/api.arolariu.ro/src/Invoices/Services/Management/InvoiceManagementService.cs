namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;
using arolariu.Backend.Domain.Invoices.DTOs;
using arolariu.Backend.Domain.Invoices.DTOs.Analysis;
using arolariu.Backend.Domain.Invoices.Services.Processing;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

/// <summary>
/// Routes endpoint and worker requests into CRUD or analysis processing, and coordinates cross-processing analysis persistence.
/// </summary>
public sealed partial class InvoiceManagementService : IInvoiceManagementService
{
  private const long MaximumDequeueCount = 5;
  private readonly ICrudProcessingService crudProcessingService;
  private readonly IAnalysisProcessingService analysisProcessingService;

  /// <summary>
  /// Initializes a new instance of the <see cref="InvoiceManagementService"/> class.
  /// </summary>
  public InvoiceManagementService(
    ICrudProcessingService crudProcessingService,
    IAnalysisProcessingService analysisProcessingService)
  {
    ArgumentNullException.ThrowIfNull(crudProcessingService);
    ArgumentNullException.ThrowIfNull(analysisProcessingService);

    this.crudProcessingService = crudProcessingService;
    this.analysisProcessingService = analysisProcessingService;
  }

  /// <inheritdoc/>
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
      await crudProcessingService.CreateInvoice(invoice, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> ReadInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoice));
      return await crudProcessingService.ReadInvoice(identifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Invoice>> ReadInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoices));
      return await crudProcessingService.ReadInvoices(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Invoice> UpdateInvoice(Invoice updatedInvoice, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateInvoice));
      return await crudProcessingService
        .UpdateInvoice(updatedInvoice, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoice(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
      await crudProcessingService.DeleteInvoice(identifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoices(Guid userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoices));
      await crudProcessingService.DeleteInvoices(userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task AddProduct(Product product, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddProduct));
      await crudProcessingService.AddProduct(product, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Product> UpdateProduct(
    string productName,
    Product updatedProduct,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProduct));
      return await crudProcessingService
        .UpdateProduct(productName, updatedProduct, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Product>> GetProducts(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProducts));
      return await crudProcessingService.GetProducts(invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Product> GetProduct(string productName, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetProduct));
      return await crudProcessingService.GetProduct(productName, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteProduct(
    string productName,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
      await crudProcessingService.DeleteProduct(productName, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task CreateInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceScan));
      await crudProcessingService.CreateInvoiceScan(scan, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<InvoiceScan>> ReadInvoiceScans(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceScans));
      return await crudProcessingService.ReadInvoiceScans(invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteInvoiceScan(InvoiceScan scan, Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoiceScan));
      await crudProcessingService.DeleteInvoiceScan(scan, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task AddMetadataToInvoice(
    IDictionary<string, object> metadata,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(AddMetadataToInvoice));
      await crudProcessingService
        .AddMetadataToInvoice(metadata, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> UpdateMetadataOnInvoice(
    IDictionary<string, object> metadata,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMetadataOnInvoice));
      return await crudProcessingService
        .UpdateMetadataOnInvoice(metadata, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IDictionary<string, object>> GetMetadataFromInvoice(
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(GetMetadataFromInvoice));
      return await crudProcessingService
        .GetMetadataFromInvoice(invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteMetadataFromInvoice(
    IEnumerable<string> metadataKeys,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMetadataFromInvoice));
      await crudProcessingService
        .DeleteMetadataFromInvoice(metadataKeys, invoiceIdentifier, userIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task CreateMerchant(Merchant merchant, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateMerchant));
      await crudProcessingService.CreateMerchant(merchant, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Merchant> ReadMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchant));
      return await crudProcessingService.ReadMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<IEnumerable<Merchant>> ReadMerchants(Guid parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(ReadMerchants));
      return await crudProcessingService.ReadMerchants(parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<Merchant> UpdateMerchant(Merchant updatedMerchant, Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateMerchant));
      return await crudProcessingService.UpdateMerchant(updatedMerchant, identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task DeleteMerchant(Guid identifier, Guid? parentCompanyId, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteMerchant));
      await crudProcessingService.DeleteMerchant(identifier, parentCompanyId, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<InvoiceAnalysisExecutionResult> PersistInvoiceAnalysisAsync(
    InvoiceAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistInvoiceAnalysisAsync));
      return await crudProcessingService.PersistInvoiceAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<MerchantAnalysisExecutionResult> PersistMerchantAnalysisAsync(
    MerchantAnalysisExecutionResult executionResult,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(PersistMerchantAnalysisAsync));
      return await crudProcessingService.PersistMerchantAnalysisAsync(executionResult, cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task EnsureAnalysisQueueAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisQueueAsync));
      await analysisProcessingService.EnsureAnalysisQueueAsync(cancellationToken).ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueInvoiceAnalysisAsync(
    Guid invoiceId,
    Guid userIdentifier,
    AnalyzeInvoiceRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueInvoiceAnalysisAsync));
      _ = await crudProcessingService.ReadInvoice(invoiceId, userIdentifier, cancellationToken).ConfigureAwait(false);
      return await analysisProcessingService
        .QueueInvoiceAnalysisAsync(invoiceId, userIdentifier, request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<AnalysisAcceptedResponseDto> QueueMerchantAnalysisAsync(
    Guid merchantId,
    Guid userIdentifier,
    AnalyzeMerchantRequestDto request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(QueueMerchantAnalysisAsync));
      Merchant merchant = await crudProcessingService
        .ReadMerchant(merchantId, parentCompanyId: null, cancellationToken)
        .ConfigureAwait(false);

      if (merchant.CreatedBy != Guid.Empty && merchant.CreatedBy != userIdentifier)
      {
        throw new MerchantForbiddenAccessException(merchantId, userIdentifier);
      }

      return await analysisProcessingService
        .QueueMerchantAnalysisAsync(merchant, userIdentifier, request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  /// <inheritdoc/>
  public async Task<bool> TryExecuteNextAnalysisAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(TryExecuteNextAnalysisAsync));
      AnalysisQueueReceipt? receipt = await analysisProcessingService
        .ReceiveNextAnalysisAsync(cancellationToken)
        .ConfigureAwait(false);

      if (receipt is null)
      {
        return false;
      }

      AnalysisFailureReason? failureReason = await analysisProcessingService
        .ExecuteWithVisibilityRenewalAsync(
          receipt,
          renewalToken => ExecuteAnalysisAttemptAsync(receipt.Message, renewalToken),
          cancellationToken)
        .ConfigureAwait(false);

      if (!failureReason.HasValue || receipt.DequeueCount >= MaximumDequeueCount)
      {
        await analysisProcessingService
          .DeleteAnalysisAsync(
            receipt,
            failureReason,
            cancellationToken)
          .ConfigureAwait(false);
      }

      return true;
    }).ConfigureAwait(false);

  [System.Diagnostics.CodeAnalysis.SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Every queue attempt must be reduced to a bounded failure reason so Azure Queue can apply retry or terminal deletion policy.")]
  private async Task<AnalysisFailureReason?> ExecuteAnalysisAttemptAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    try
    {
      return message.TargetType switch
      {
        AnalysisTargetType.Invoice
          => await ExecuteInvoiceAnalysisAsync(message, cancellationToken).ConfigureAwait(false),
        AnalysisTargetType.Merchant
          => await ExecuteMerchantAnalysisAsync(message, cancellationToken).ConfigureAwait(false),
        _ => AnalysisFailureReason.UnsupportedTarget,
      };
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception exception)
    {
      return ResolveFailureReason(exception);
    }
  }

  private async Task<AnalysisFailureReason?> ExecuteInvoiceAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    Invoice invoice = await crudProcessingService
      .ReadInvoice(
        message.TargetId,
        message.TargetPartitionIdentifier ?? message.RequestedBy,
        cancellationToken)
      .ConfigureAwait(false);

    InvoiceAnalysisExecutionResult executionResult = await analysisProcessingService
      .ExecuteInvoiceAnalysisAsync(message, invoice, cancellationToken)
      .ConfigureAwait(false);

    if (executionResult.Failed)
    {
      return executionResult.FailureReason;
    }

    _ = await crudProcessingService
      .PersistInvoiceAnalysisAsync(executionResult, cancellationToken)
      .ConfigureAwait(false);

    return null;
  }

  private async Task<AnalysisFailureReason?> ExecuteMerchantAnalysisAsync(
    AnalysisQueueMessage message,
    CancellationToken cancellationToken)
  {
    Merchant merchant = await crudProcessingService
      .ReadMerchant(message.TargetId, message.TargetPartitionIdentifier, cancellationToken)
      .ConfigureAwait(false);

    MerchantAnalysisExecutionResult executionResult = await analysisProcessingService
      .ExecuteMerchantAnalysisAsync(message, merchant, cancellationToken)
      .ConfigureAwait(false);

    if (executionResult.Failed)
    {
      return executionResult.FailureReason;
    }

    _ = await crudProcessingService
      .PersistMerchantAnalysisAsync(executionResult, cancellationToken)
      .ConfigureAwait(false);

    return null;
  }

  private static AnalysisFailureReason ResolveFailureReason(Exception exception)
  {
    if (ContainsExceptionMarker<INotFoundException>(exception))
    {
      return AnalysisFailureReason.DependencyValidation;
    }

    if (ContainsExceptionMarker<ITimeoutException>(exception))
    {
      return AnalysisFailureReason.Dependency;
    }

    if (ContainsExceptionMarker<IDependencyValidationException>(exception))
    {
      return AnalysisFailureReason.DependencyValidation;
    }

    if (ContainsExceptionMarker<IDependencyException>(exception))
    {
      return AnalysisFailureReason.Dependency;
    }

    if (ContainsExceptionMarker<IValidationException>(exception))
    {
      return AnalysisFailureReason.Validation;
    }

    return AnalysisFailureReason.TargetPersistence;
  }
}
