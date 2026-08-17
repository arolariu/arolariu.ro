namespace arolariu.Backend.Domain.Tests.Invoices.Services.Processing;


using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;
using arolariu.Backend.Domain.Tests.Invoices.Helpers;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;

/// <summary>
/// Verifies queue-depth observability failures cannot interrupt durable work that has already been claimed.
/// </summary>
[TestClass]
public sealed class AnalysisProcessingQueueDepthResilienceTests
{
  /// <summary>
  /// Verifies a queue-depth count failure after a successful claim leaves the claimed target processing and terminal
  /// completion path intact.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenQueueDepthRefreshFailsAfterClaim_PersistsTargetAndCompletesRun()
  {
    var merchant = new Merchant
    {
      id = Guid.CreateVersion7(),
      ParentCompanyId = Guid.CreateVersion7(),
      Name = "Test merchant",
    };
    AnalysisRun queuedRun = AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Fast(),
      traceParent: null);
    var runBroker = new FailingQueueDepthAnalysisRunBroker(queuedRun);
    var aggregateBroker = new RecordingAggregateBroker(merchant);
    AnalysisProcessingService service = CreateService(
      runBroker,
      aggregateBroker,
      new FixedTimeProvider(DateTimeOffset.UtcNow));

    bool processed = await service
      .TryExecuteNextRunAsync("queue-depth-resilience-worker", CancellationToken.None)
      .ConfigureAwait(false);

    Assert.IsTrue(processed);
    Assert.AreEqual(1, runBroker.CountAttempts);
    Assert.AreEqual(1, aggregateBroker.MerchantUpdateCount);
    Assert.AreEqual(AnalysisRunStatus.Completed, runBroker.StoredRun.Status);
  }

  /// <summary>
  /// Verifies caller cancellation raised during a queue-depth refresh propagates instead of being treated as a
  /// best-effort observability failure.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenCallerCancelsDuringQueueDepthRefresh_PropagatesCancellation()
  {
    var merchant = new Merchant
    {
      id = Guid.CreateVersion7(),
      ParentCompanyId = Guid.CreateVersion7(),
      Name = "Test merchant",
    };
    AnalysisRun queuedRun = AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Fast(),
      traceParent: null);
    using var cancellation = new CancellationTokenSource();
    var runBroker = new FailingQueueDepthAnalysisRunBroker(queuedRun, cancellation);
    var aggregateBroker = new RecordingAggregateBroker(merchant);
    AnalysisProcessingService service = CreateService(
      runBroker,
      aggregateBroker,
      new FixedTimeProvider(DateTimeOffset.UtcNow));

    await Assert.ThrowsExactlyAsync<OperationCanceledException>(
      () => service.TryExecuteNextRunAsync("queue-depth-cancellation-worker", cancellation.Token));

    Assert.AreEqual(1, runBroker.CountAttempts);
    Assert.AreEqual(0, aggregateBroker.MerchantUpdateCount);
    Assert.AreEqual(AnalysisRunStatus.Running, runBroker.StoredRun.Status);
  }

  /// <summary>
  /// Verifies distinct injected clocks each receive an independent queue-depth refresh coordinator.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenProvidersAreIndependent_DoesNotSuppressEitherRefresh()
  {
    DateTimeOffset now = DateTimeOffset.UtcNow;
    var first = CreateScenario(new FixedTimeProvider(now));
    var second = CreateScenario(new FixedTimeProvider(now));

    await first.Service.TryExecuteNextRunAsync("independent-clock-first", CancellationToken.None).ConfigureAwait(false);
    await second.Service.TryExecuteNextRunAsync("independent-clock-second", CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(1, first.RunBroker.CountAttempts);
    Assert.AreEqual(1, second.RunBroker.CountAttempts);
  }

  /// <summary>
  /// Verifies scopes sharing the same production-equivalent clock still throttle queue-depth refreshes together.
  /// </summary>
  [TestMethod]
  public async Task TryExecuteNextRunAsync_WhenProviderIsShared_SuppressesSecondRefreshWithinInterval()
  {
    var sharedProvider = new FixedTimeProvider(DateTimeOffset.UtcNow);
    var first = CreateScenario(sharedProvider);
    var second = CreateScenario(sharedProvider);

    await first.Service.TryExecuteNextRunAsync("shared-clock-first", CancellationToken.None).ConfigureAwait(false);
    await second.Service.TryExecuteNextRunAsync("shared-clock-second", CancellationToken.None).ConfigureAwait(false);

    Assert.AreEqual(1, first.RunBroker.CountAttempts);
    Assert.AreEqual(0, second.RunBroker.CountAttempts);
  }

  private static QueueDepthScenario CreateScenario(TimeProvider timeProvider)
  {
    var merchant = new Merchant
    {
      id = Guid.CreateVersion7(),
      ParentCompanyId = Guid.CreateVersion7(),
      Name = "Test merchant",
    };
    AnalysisRun queuedRun = AnalysisRun.CreateMerchant(
      merchant.id,
      Guid.CreateVersion7(),
      Guid.CreateVersion7(),
      merchant.ParentCompanyId,
      MerchantAnalysisOptions.Fast(),
      traceParent: null);
    var runBroker = new FailingQueueDepthAnalysisRunBroker(queuedRun);
    var aggregateBroker = new RecordingAggregateBroker(merchant);

    return new QueueDepthScenario(CreateService(runBroker, aggregateBroker, timeProvider), runBroker);
  }

  private static AnalysisProcessingService CreateService(
    IAnalysisRunBroker runBroker,
    IInvoiceNoSqlBroker aggregateBroker,
    TimeProvider timeProvider)
  {
    var invoiceStorage = new InvoiceStorageFoundationService(
      aggregateBroker,
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance);
    var merchantStorage = new MerchantStorageFoundationService(
      aggregateBroker,
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance);
    var analysisRunFoundation = new AnalysisRunFoundationService(runBroker, NullLoggerFactory.Instance);
    var documentFoundation = new DocumentAnalysisFoundationService(
      new UnusedDocumentIntelligenceBroker(),
      NullLoggerFactory.Instance);
    var generativeFoundation = new GenerativeAnalysisFoundationService(
      new RejectingGenerativeAiBroker(),
      TaxonomyBrokerTestFactory.Create(),
      NullLoggerFactory.Instance,
      new GenerativeAnalysisRetryPolicy((_, _) => Task.CompletedTask, () => 0));
    var analysisOrchestration = new AnalysisOrchestrationService(
      analysisRunFoundation,
      documentFoundation,
      generativeFoundation,
      NullLoggerFactory.Instance);

    return new AnalysisProcessingService(
      new InvoiceOrchestrationService(invoiceStorage, NullLoggerFactory.Instance),
      new MerchantOrchestrationService(merchantStorage, NullLoggerFactory.Instance),
      analysisOrchestration,
      NullLoggerFactory.Instance,
      renewalInterval: TimeSpan.FromSeconds(30),
      leaseDuration: TimeSpan.FromMinutes(2),
      timeProvider,
      queueDepthRefreshInterval: TimeSpan.FromSeconds(30));
  }

  private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
  {
    /// <inheritdoc/>
    public override DateTimeOffset GetUtcNow() => utcNow;
  }

  private sealed record QueueDepthScenario(
    AnalysisProcessingService Service,
    FailingQueueDepthAnalysisRunBroker RunBroker);

  private sealed class FailingQueueDepthAnalysisRunBroker(
    AnalysisRun queuedRun,
    CancellationTokenSource? cancellationSource = null) : IAnalysisRunBroker
  {
    private AnalysisRun? claimCandidate = queuedRun;
    private int revision;

    internal int CountAttempts { get; private set; }

    internal AnalysisRun StoredRun { get; private set; } = queuedRun;

    ValueTask IAnalysisRunBroker.EnsureContainerAsync(CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.CompletedTask;
    }

    ValueTask<AnalysisRun> IAnalysisRunBroker.CreateAsync(AnalysisRun run, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      StoredRun = run;
      return ValueTask.FromResult(run);
    }

    ValueTask<AnalysisRun?> IAnalysisRunBroker.ReadAsync(Guid runId, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult<AnalysisRun?>(StoredRun.Id == runId ? StoredRun : null);
    }

    async IAsyncEnumerable<AnalysisRun> IAnalysisRunBroker.StreamClaimCandidatesAsync(
      DateTimeOffset now,
      [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();

      if (claimCandidate is not null)
      {
        AnalysisRun candidate = claimCandidate;
        claimCandidate = null;
        yield return candidate;
      }

      await Task.CompletedTask.ConfigureAwait(false);
    }

    async ValueTask<IReadOnlyDictionary<AnalysisTargetType, long>> IAnalysisRunBroker.CountPendingByTargetTypeAsync(
      DateTimeOffset now,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      CountAttempts++;

      if (cancellationSource is not null)
      {
        await cancellationSource.CancelAsync().ConfigureAwait(false);
        cancellationToken.ThrowIfCancellationRequested();
      }

      throw new InvalidOperationException("pending-run count dependency failed");
    }

    ValueTask<AnalysisRun> IAnalysisRunBroker.ReplaceAsync(
      AnalysisRun run,
      string expectedETag,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      StoredRun = run with { ETag = (++revision).ToString(System.Globalization.CultureInfo.InvariantCulture) };
      return ValueTask.FromResult(StoredRun);
    }
  }

  private sealed class RecordingAggregateBroker(Merchant merchant) : IInvoiceNoSqlBroker
  {
    private Merchant storedMerchant = merchant;

    internal int MerchantUpdateCount { get; private set; }

    ValueTask<Invoice> IInvoiceNoSqlBroker.CreateInvoiceAsync(Invoice invoice, CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask<Invoice?> IInvoiceNoSqlBroker.ReadInvoiceAsync(
      Guid invoiceIdentifier,
      Guid? userIdentifier,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask<IEnumerable<Invoice>> IInvoiceNoSqlBroker.ReadInvoicesAsync(
      Guid userIdentifier,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask<Invoice> IInvoiceNoSqlBroker.UpdateInvoiceAsync(
      Guid invoiceIdentifier,
      Invoice updatedInvoice,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask<Invoice> IInvoiceNoSqlBroker.UpdateInvoiceAsync(
      Invoice currentInvoice,
      Invoice updatedInvoice,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask IInvoiceNoSqlBroker.DeleteInvoiceAsync(
      Guid invoiceIdentifier,
      Guid? userIdentifier,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask IInvoiceNoSqlBroker.DeleteInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken) =>
      throw new NotSupportedException();

    ValueTask<Merchant> IInvoiceNoSqlBroker.CreateMerchantAsync(Merchant createdMerchant, CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      storedMerchant = createdMerchant;
      return ValueTask.FromResult(createdMerchant);
    }

    ValueTask<Merchant?> IInvoiceNoSqlBroker.ReadMerchantAsync(
      Guid merchantIdentifier,
      Guid? parentCompanyId,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult<Merchant?>(storedMerchant.id == merchantIdentifier ? storedMerchant : null);
    }

    ValueTask<IEnumerable<Merchant>> IInvoiceNoSqlBroker.ReadMerchantsAsync(
      Guid parentCompanyId,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult<IEnumerable<Merchant>>([storedMerchant]);
    }

    ValueTask<Merchant?> IInvoiceNoSqlBroker.FindMerchantByNormalizedNameAsync(
      string normalizedName,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      return ValueTask.FromResult<Merchant?>(null);
    }

    ValueTask<Merchant> IInvoiceNoSqlBroker.UpdateMerchantAsync(
      Guid merchantIdentifier,
      Merchant updatedMerchant,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      storedMerchant = updatedMerchant;
      MerchantUpdateCount++;
      return ValueTask.FromResult(updatedMerchant);
    }

    ValueTask<Merchant> IInvoiceNoSqlBroker.UpdateMerchantAsync(
      Merchant currentMerchant,
      Merchant updatedMerchant,
      CancellationToken cancellationToken)
    {
      cancellationToken.ThrowIfCancellationRequested();
      storedMerchant = updatedMerchant;
      MerchantUpdateCount++;
      return ValueTask.FromResult(updatedMerchant);
    }

    ValueTask IInvoiceNoSqlBroker.DeleteMerchantAsync(
      Guid merchantIdentifier,
      Guid? parentCompanyId,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();
  }

  private sealed class UnusedDocumentIntelligenceBroker : IDocumentIntelligenceBroker
  {
    ValueTask<ReceiptDocument> IDocumentIntelligenceBroker.AnalyzeReceiptAsync(
      Uri scanLocation,
      CancellationToken cancellationToken) =>
      throw new NotSupportedException();
  }

  private sealed class RejectingGenerativeAiBroker : IGenerativeAiBroker
  {
    Task<GenerativeResponse<T>> IGenerativeAiBroker.GenerateStructuredAsync<T>(
      GenerativeRequest request,
      CancellationToken cancellationToken) =>
      Task.FromException<GenerativeResponse<T>>(
        new InvalidStructuredOutputException("A provider response was unavailable."));
  }
}
