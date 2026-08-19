namespace arolariu.Backend.Domain.Invoices.Services.Management;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.Exceptions;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
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
public sealed partial class InvoiceManagementService(
  ICrudProcessingService crudProcessingService,
  IAnalysisProcessingService analysisProcessingService) : IInvoiceManagementService
{
  private const string TargetPersistenceFailureCode = "TARGET_PERSISTENCE_FAILED";
  private const string TargetNotFoundFailureCode = "TARGET_NOT_FOUND";
  private const string UnsupportedTargetTypeFailureCode = "UNSUPPORTED_TARGET_TYPE";

  private readonly ICrudProcessingService crudProcessingService =
    crudProcessingService ?? throw new ArgumentNullException(nameof(crudProcessingService));
  private readonly IAnalysisProcessingService analysisProcessingService =
    analysisProcessingService ?? throw new ArgumentNullException(nameof(analysisProcessingService));

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
    ProductUpdateSelector selector,
    Product updatedProduct,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(UpdateProduct));
      return await crudProcessingService
        .UpdateProduct(selector, updatedProduct, invoiceIdentifier, userIdentifier, cancellationToken)
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
    ProductUpdateSelector selector,
    Guid invoiceIdentifier,
    Guid? userIdentifier,
    CancellationToken cancellationToken)
    => await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteProduct));
      await crudProcessingService.DeleteProduct(selector, invoiceIdentifier, userIdentifier, cancellationToken).ConfigureAwait(false);
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
  public async Task EnsureAnalysisStoreAsync(CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(EnsureAnalysisStoreAsync));
      await analysisProcessingService.EnsureAnalysisStoreAsync(cancellationToken).ConfigureAwait(false);
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
  public async Task<bool> TryExecuteNextRunAsync(string leaseOwner, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = InvoicePackageTracing.StartActivity(nameof(TryExecuteNextRunAsync));
      AnalysisRun? claimed = await analysisProcessingService.ClaimNextRunAsync(leaseOwner, cancellationToken).ConfigureAwait(false);

      if (claimed is null)
      {
        return false;
      }

      return await analysisProcessingService
        .ExecuteWithLeaseHeartbeatAsync(
          claimed,
          leaseOwner,
          leaseToken => ExecuteClaimedRunAsync(claimed, leaseOwner, leaseToken),
          cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);

  private async Task<bool> ExecuteClaimedRunAsync(
    AnalysisRun claimed,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    switch (claimed.TargetType)
    {
      case AnalysisTargetType.Invoice:
        return await ExecuteInvoiceRunAsync(claimed, leaseOwner, cancellationToken).ConfigureAwait(false);

      case AnalysisTargetType.Merchant:
        return await ExecuteMerchantRunAsync(claimed, leaseOwner, cancellationToken).ConfigureAwait(false);

      default:
        await analysisProcessingService
          .FailRunExecutionAsync(
            new FailedAnalysisExecutionResult(claimed, UnsupportedTargetTypeFailureCode, AnalysisFailureReason.UnsupportedTarget),
            leaseOwner,
            cancellationToken)
          .ConfigureAwait(false);
        return true;
    }
  }

  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any persistence failure after successful analysis must fail the durable run explicitly.")]
  private async Task<bool> ExecuteInvoiceRunAsync(
    AnalysisRun claimed,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    Invoice invoice;

    try
    {
      invoice = await crudProcessingService
        .ReadInvoice(claimed.TargetId, claimed.TargetPartitionIdentifier ?? claimed.RequestedBy, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (Exception exception) when (ContainsExceptionMarker<INotFoundException>(exception))
    {
      await FailMissingTargetAsync(claimed, leaseOwner, cancellationToken).ConfigureAwait(false);
      return true;
    }

    InvoiceAnalysisExecutionResult executionResult = await analysisProcessingService
      .ExecuteInvoiceRunAsync(claimed, invoice, leaseOwner, cancellationToken)
      .ConfigureAwait(false);

    if (executionResult.Failed)
    {
      await analysisProcessingService
        .FailRunExecutionAsync(executionResult, leaseOwner, cancellationToken)
        .ConfigureAwait(false);
      return true;
    }

    try
    {
      InvoiceAnalysisExecutionResult persisted = await crudProcessingService
        .PersistInvoiceAnalysisAsync(executionResult, cancellationToken)
        .ConfigureAwait(false);

      await analysisProcessingService
        .CompleteRunExecutionAsync(persisted, leaseOwner, cancellationToken)
        .ConfigureAwait(false);

      return true;
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception)
    {
      await analysisProcessingService
        .FailRunExecutionAsync(
          new FailedAnalysisExecutionResult(claimed, TargetPersistenceFailureCode, AnalysisFailureReason.TargetPersistence),
          leaseOwner,
          cancellationToken)
        .ConfigureAwait(false);

      return true;
    }
  }

  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any persistence failure after successful analysis must fail the durable run explicitly.")]
  private async Task<bool> ExecuteMerchantRunAsync(
    AnalysisRun claimed,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    Merchant merchant;

    try
    {
      merchant = await crudProcessingService
        .ReadMerchant(claimed.TargetId, claimed.TargetPartitionIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (Exception exception) when (ContainsExceptionMarker<INotFoundException>(exception))
    {
      await FailMissingTargetAsync(claimed, leaseOwner, cancellationToken).ConfigureAwait(false);
      return true;
    }

    MerchantAnalysisExecutionResult executionResult = await analysisProcessingService
      .ExecuteMerchantRunAsync(claimed, merchant, leaseOwner, cancellationToken)
      .ConfigureAwait(false);

    if (executionResult.Failed)
    {
      await analysisProcessingService
        .FailRunExecutionAsync(executionResult, leaseOwner, cancellationToken)
        .ConfigureAwait(false);
      return true;
    }

    try
    {
      MerchantAnalysisExecutionResult persisted = await crudProcessingService
        .PersistMerchantAnalysisAsync(executionResult, cancellationToken)
        .ConfigureAwait(false);

      await analysisProcessingService
        .CompleteRunExecutionAsync(persisted, leaseOwner, cancellationToken)
        .ConfigureAwait(false);

      return true;
    }
    catch (OperationCanceledException)
    {
      throw;
    }
    catch (Exception)
    {
      await analysisProcessingService
        .FailRunExecutionAsync(
          new FailedAnalysisExecutionResult(claimed, TargetPersistenceFailureCode, AnalysisFailureReason.TargetPersistence),
          leaseOwner,
          cancellationToken)
        .ConfigureAwait(false);

      return true;
    }
  }

  private async Task FailMissingTargetAsync(
    AnalysisRun claimed,
    string leaseOwner,
    CancellationToken cancellationToken) =>
    await analysisProcessingService
      .FailRunExecutionAsync(
        new FailedAnalysisExecutionResult(
          claimed,
          TargetNotFoundFailureCode,
          AnalysisFailureReason.DependencyValidation),
        leaseOwner,
        cancellationToken)
      .ConfigureAwait(false);
}
