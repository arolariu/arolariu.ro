namespace arolariu.Backend.Domain.Tests.Invoices.Helpers;

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging.Abstractions;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.Brokers.AnalysisRunBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DatabaseBroker;
using arolariu.Backend.Domain.Invoices.Brokers.DocumentIntelligenceBroker;
using arolariu.Backend.Domain.Invoices.Brokers.GenerativeAiBroker;
using arolariu.Backend.Domain.Invoices.Brokers.TaxonomyBroker;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Recipes;
using arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;
using arolariu.Backend.Domain.Invoices.Services.Foundation.DocumentAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.GenerativeAnalysis;
using arolariu.Backend.Domain.Invoices.Services.Foundation.InvoiceStorage;
using arolariu.Backend.Domain.Invoices.Services.Foundation.MerchantStorage;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.InvoiceService;
using arolariu.Backend.Domain.Invoices.Services.Orchestration.MerchantService;
using arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

/// <summary>
/// Composes the analysis processing pipeline with real repository service layers and deterministic external boundaries.
/// </summary>
/// <remarks>
/// <para>The harness deliberately only doubles broker contracts: analysis-run persistence, aggregate persistence,
/// document intelligence, and generative AI. Every Foundation, Orchestration, and Processing service is the
/// production implementation, preserving the flow mandated by RFC 2003.</para>
/// </remarks>
internal sealed class AnalysisPipelineHarness
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AnalysisPipelineHarness"/> class.
  /// </summary>
  /// <param name="renewalInterval">The processing heartbeat cadence.</param>
  /// <param name="timeProvider">The deterministic clock used for run transitions.</param>
  /// <param name="queueDepthRefreshInterval">The durable queue-depth sampling interval.</param>
  internal AnalysisPipelineHarness(
    TimeSpan? renewalInterval = null,
    TimeProvider? timeProvider = null,
    TimeSpan? queueDepthRefreshInterval = null)
  {
    Timeline = [];
    AggregateBroker = new InMemoryAggregateBroker(Timeline);
    RunBroker = new InMemoryAnalysisRunBroker(Timeline);
    DocumentBroker = new ControlledDocumentIntelligenceBroker();
    GenerativeBroker = new AnalysisGenerativeAiBroker();
    ITaxonomyBroker taxonomyBroker = TaxonomyBrokerTestFactory.Create();

    var invoiceStorage = new InvoiceStorageFoundationService(
      AggregateBroker,
      taxonomyBroker,
      NullLoggerFactory.Instance);
    var merchantStorage = new MerchantStorageFoundationService(
      AggregateBroker,
      taxonomyBroker,
      NullLoggerFactory.Instance);
    var analysisRunFoundation = new AnalysisRunFoundationService(RunBroker, NullLoggerFactory.Instance);
    var documentFoundation = new DocumentAnalysisFoundationService(DocumentBroker, NullLoggerFactory.Instance);
    var generativeFoundation = new GenerativeAnalysisFoundationService(
      GenerativeBroker,
      taxonomyBroker,
      NullLoggerFactory.Instance,
      new GenerativeAnalysisRetryPolicy((_, _) => Task.CompletedTask, static () => 0));

    InvoiceOrchestration = new InvoiceOrchestrationService(invoiceStorage, NullLoggerFactory.Instance);
    MerchantOrchestration = new MerchantOrchestrationService(merchantStorage, NullLoggerFactory.Instance);
    AnalysisOrchestration = new AnalysisOrchestrationService(
      analysisRunFoundation,
      documentFoundation,
      generativeFoundation,
      NullLoggerFactory.Instance);

    Service = new AnalysisProcessingService(
      InvoiceOrchestration,
      MerchantOrchestration,
      AnalysisOrchestration,
      NullLoggerFactory.Instance,
      renewalInterval ?? TimeSpan.FromSeconds(30),
      TimeSpan.FromMinutes(2),
      timeProvider ?? new ManualTimeProvider(DateTimeOffset.UtcNow),
      queueDepthRefreshInterval ?? TimeSpan.FromSeconds(30));
  }

  /// <summary>Gets the real processing service under test.</summary>
  internal AnalysisProcessingService Service { get; }

  /// <summary>Gets the real invoice orchestration service in the composed pipeline.</summary>
  internal InvoiceOrchestrationService InvoiceOrchestration { get; }

  /// <summary>Gets the real merchant orchestration service in the composed pipeline.</summary>
  internal MerchantOrchestrationService MerchantOrchestration { get; }

  /// <summary>Gets the real analysis orchestration service in the composed pipeline.</summary>
  internal AnalysisOrchestrationService AnalysisOrchestration { get; }

  /// <summary>Gets the controllable aggregate persistence boundary.</summary>
  internal InMemoryAggregateBroker AggregateBroker { get; }

  /// <summary>Gets the controllable durable analysis-run persistence boundary.</summary>
  internal InMemoryAnalysisRunBroker RunBroker { get; }

  /// <summary>Gets the controllable document-intelligence boundary.</summary>
  internal ControlledDocumentIntelligenceBroker DocumentBroker { get; }

  /// <summary>Gets the controllable generative-AI boundary.</summary>
  internal AnalysisGenerativeAiBroker GenerativeBroker { get; }

  /// <summary>Gets ordered records of external persistence calls.</summary>
  internal List<string> Timeline { get; }

  /// <summary>
  /// Adds an invoice to the aggregate boundary, supplying one valid scan when it has none.
  /// </summary>
  /// <param name="invoice">The invoice to seed.</param>
  internal void SeedInvoice(Invoice invoice)
  {
    ArgumentNullException.ThrowIfNull(invoice);

    if (invoice.Scans.Count == 0)
    {
      invoice.Scans.Add(new InvoiceScan(ScanType.JPG, new Uri("https://example.test/receipt.jpg"), Metadata: null));
    }

    AggregateBroker.Invoices[invoice.id] = invoice;
  }

  /// <summary>Adds a merchant to the aggregate boundary.</summary>
  /// <param name="merchant">The merchant to seed.</param>
  internal void SeedMerchant(Merchant merchant)
  {
    ArgumentNullException.ThrowIfNull(merchant);
    AggregateBroker.Merchants[merchant.id] = merchant;
  }

  /// <summary>
  /// Enqueues one run directly at the external persistence boundary so the real claim path owns its lease transition.
  /// </summary>
  /// <param name="run">The durable run to make claimable.</param>
  internal void SetClaimableRun(AnalysisRun? run)
  {
    RunBroker.SetClaimableRun(run);
    GenerativeBroker.SourceRunIdentifier = run?.Id;
  }

  /// <summary>
  /// Configures real document and generative foundations to yield the supplied invoice analysis shape.
  /// </summary>
  /// <param name="result">The desired capability output; null sections are produced by external boundary failures.</param>
  internal void ConfigureInvoiceResult(InvoiceAnalysisResult? result)
  {
    GenerativeBroker.InvoiceResult = result;
    DocumentBroker.ExtractionResult = result?.ExtractionResult;
  }

  /// <summary>
  /// Configures real generative foundations to yield the supplied merchant analysis shape.
  /// </summary>
  /// <param name="result">The desired capability output; null sections are produced by external boundary failures.</param>
  internal void ConfigureMerchantResult(MerchantAnalysisResult? result) =>
    GenerativeBroker.MerchantResult = result;

  /// <summary>
  /// Provides deterministic UTC time for processing-service tests without waiting for wall-clock time.
  /// </summary>
  /// <param name="utcNow">The initial UTC instant.</param>
  internal sealed class ManualTimeProvider(DateTimeOffset utcNow) : TimeProvider
  {
    private DateTimeOffset currentUtcNow = utcNow;

    /// <inheritdoc/>
    public override DateTimeOffset GetUtcNow() => currentUtcNow;

    /// <summary>Advances the clock by a non-negative duration.</summary>
    /// <param name="duration">The duration to add to the current UTC instant.</param>
    internal void Advance(TimeSpan duration)
    {
      ArgumentOutOfRangeException.ThrowIfLessThan(duration, TimeSpan.Zero);
      currentUtcNow = currentUtcNow.Add(duration);
    }
  }
}

/// <summary>
/// Deterministic in-memory implementation of the external aggregate persistence broker.
/// </summary>
internal sealed class InMemoryAggregateBroker(List<string> timeline) : IInvoiceNoSqlBroker
{
  /// <summary>Gets the persisted invoices indexed by identifier.</summary>
  internal Dictionary<Guid, Invoice> Invoices { get; } = [];

  /// <summary>Gets the persisted merchants indexed by identifier.</summary>
  internal Dictionary<Guid, Merchant> Merchants { get; } = [];

  /// <summary>Gets every invoice update submitted to the boundary.</summary>
  internal List<Invoice> UpdatedInvoices { get; } = [];

  /// <summary>Gets every invoice-read partition submitted to the boundary.</summary>
  internal List<Guid?> InvoiceReadPartitions { get; } = [];

  /// <summary>Gets every merchant creation submitted to the boundary.</summary>
  internal List<Merchant> CreatedMerchants { get; } = [];

  /// <summary>Gets every merchant update submitted to the boundary.</summary>
  internal List<Merchant> UpdatedMerchants { get; } = [];

  /// <summary>Gets every merchant-read partition submitted to the boundary.</summary>
  internal List<Guid?> MerchantReadPartitions { get; } = [];

  /// <summary>Gets or sets a failure emitted by invoice reads.</summary>
  internal Exception? ReadInvoiceFailure { get; set; }

  /// <summary>Gets or sets a compatibility alias for invoice-read failures.</summary>
  internal Exception? ReadFailure
  {
    get => ReadInvoiceFailure;
    set => ReadInvoiceFailure = value;
  }

  /// <summary>Gets or sets a failure emitted by invoice writes.</summary>
  internal Exception? UpdateInvoiceFailure { get; set; }

  /// <summary>Gets or sets a compatibility alias for invoice-write failures.</summary>
  internal Exception? UpdateFailure
  {
    get => UpdateInvoiceFailure;
    set => UpdateInvoiceFailure = value;
  }

  /// <summary>Gets or sets a failure emitted by merchant writes.</summary>
  internal Exception? UpdateMerchantFailure { get; set; }

  /// <inheritdoc/>
  public ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    Invoices[invoice.id] = invoice;
    return ValueTask.FromResult(invoice);
  }

  /// <inheritdoc/>
  public ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("read-invoice");
    InvoiceReadPartitions.Add(userIdentifier);

    if (ReadInvoiceFailure is not null)
    {
      return ValueTask.FromException<Invoice?>(ReadInvoiceFailure);
    }

    Invoices.TryGetValue(invoiceIdentifier, out Invoice? invoice);
    return ValueTask.FromResult(invoice);
  }

  /// <inheritdoc/>
  public ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    return ValueTask.FromResult<IEnumerable<Invoice>>(Invoices.Values.ToArray());
  }

  /// <inheritdoc/>
  public ValueTask<Invoice> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("update-invoice");

    if (UpdateInvoiceFailure is not null)
    {
      return ValueTask.FromException<Invoice>(UpdateInvoiceFailure);
    }

    Invoices[invoiceIdentifier] = updatedInvoice;
    UpdatedInvoices.Add(updatedInvoice);
    return ValueTask.FromResult(updatedInvoice);
  }

  /// <inheritdoc/>
  public ValueTask<Invoice> UpdateInvoiceAsync(Invoice currentInvoice, Invoice updatedInvoice, CancellationToken cancellationToken) =>
    UpdateInvoiceAsync(updatedInvoice.id, updatedInvoice, cancellationToken);

  /// <inheritdoc/>
  public ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier, Guid? userIdentifier, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    Invoices.Remove(invoiceIdentifier);
    return ValueTask.CompletedTask;
  }

  /// <inheritdoc/>
  public ValueTask DeleteInvoicesAsync(Guid userIdentifier, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    Invoices.Clear();
    return ValueTask.CompletedTask;
  }

  /// <inheritdoc/>
  public ValueTask<Merchant> CreateMerchantAsync(Merchant merchant, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("create-merchant");
    Merchants[merchant.id] = merchant;
    CreatedMerchants.Add(merchant);
    return ValueTask.FromResult(merchant);
  }

  /// <inheritdoc/>
  public ValueTask<Merchant?> ReadMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("read-merchant");
    MerchantReadPartitions.Add(parentCompanyId);
    Merchants.TryGetValue(merchantIdentifier, out Merchant? merchant);
    return ValueTask.FromResult(merchant);
  }

  /// <inheritdoc/>
  public ValueTask<IEnumerable<Merchant>> ReadMerchantsAsync(Guid parentCompanyId, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    return ValueTask.FromResult<IEnumerable<Merchant>>(Merchants.Values.ToArray());
  }

  /// <inheritdoc/>
  public ValueTask<Merchant?> FindMerchantByNormalizedNameAsync(string normalizedName, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("find-merchant");

    Merchant? merchant = Merchants.Values.FirstOrDefault(candidate =>
      string.Equals(
        MerchantNameNormalizer.Normalize(candidate.Name),
        normalizedName,
        StringComparison.Ordinal));

    return ValueTask.FromResult(merchant);
  }

  /// <inheritdoc/>
  public ValueTask<Merchant> UpdateMerchantAsync(Guid merchantIdentifier, Merchant updatedMerchant, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("update-merchant");

    if (UpdateMerchantFailure is not null)
    {
      return ValueTask.FromException<Merchant>(UpdateMerchantFailure);
    }

    Merchants[merchantIdentifier] = updatedMerchant;
    UpdatedMerchants.Add(updatedMerchant);
    return ValueTask.FromResult(updatedMerchant);
  }

  /// <inheritdoc/>
  public ValueTask<Merchant> UpdateMerchantAsync(Merchant currentMerchant, Merchant updatedMerchant, CancellationToken cancellationToken) =>
    UpdateMerchantAsync(updatedMerchant.id, updatedMerchant, cancellationToken);

  /// <inheritdoc/>
  public ValueTask DeleteMerchantAsync(Guid merchantIdentifier, Guid? parentCompanyId, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    Merchants.Remove(merchantIdentifier);
    return ValueTask.CompletedTask;
  }
}

/// <summary>
/// Deterministic in-memory implementation of the external analysis-run persistence broker.
/// </summary>
internal sealed class InMemoryAnalysisRunBroker(List<string> timeline) : IAnalysisRunBroker
{
  private readonly Dictionary<Guid, AnalysisRun> runs = [];
  private readonly TaskCompletionSource renewalObserved = new(TaskCreationOptions.RunContinuationsAsynchronously);
  private readonly TaskCompletionSource renewalAttempted = new(TaskCreationOptions.RunContinuationsAsynchronously);
  private readonly TaskCompletionSource runningReadObserved = new(TaskCreationOptions.RunContinuationsAsynchronously);
  private int revision;

  /// <summary>Gets the number of store-provisioning calls observed at the boundary.</summary>
  internal int EnsureStoreCallCount { get; private set; }

  /// <summary>Gets the number of queue-depth count calls observed at the boundary.</summary>
  internal int CountAttempts { get; private set; }

  /// <summary>Gets the number of successful renewal writes observed at the boundary.</summary>
  internal int RenewalCount { get; private set; }

  /// <summary>Gets the number of renewal persistence attempts observed at the boundary.</summary>
  internal int RenewalAttemptCount { get; private set; }

  /// <summary>Gets every persisted run.</summary>
  internal IReadOnlyCollection<AnalysisRun> Runs => runs.Values;

  /// <summary>Gets or sets a failure emitted while ensuring the run container.</summary>
  internal Exception? EnsureFailure { get; set; }

  /// <summary>Gets or sets a failure emitted while counting pending runs.</summary>
  internal Exception? CountFailure { get; set; }

  /// <summary>Gets or sets a failure emitted by a running-to-running lease renewal write.</summary>
  internal Exception? RenewalFailure { get; set; }

  /// <summary>Gets or sets a failure emitted by a terminal run transition write.</summary>
  internal Exception? TerminalTransitionFailure { get; set; }

  /// <summary>Gets or sets the externally observed queue depth.</summary>
  internal IReadOnlyDictionary<AnalysisTargetType, long> PendingRunCounts { get; set; } =
    new Dictionary<AnalysisTargetType, long>();

  /// <summary>
  /// Replaces the single claimable run while retaining explicit persisted state for observable assertions.
  /// </summary>
  /// <param name="run">The run to add, or null to leave the queue empty.</param>
  internal void SetClaimableRun(AnalysisRun? run)
  {
    runs.Clear();

    if (run is not null)
    {
      runs[run.Id] = run.WithETag(NextETag());
    }
  }

  /// <summary>Waits until a real renewal persistence attempt has reached this broker.</summary>
  /// <returns>A task completed by the next successful renewal write.</returns>
  internal Task WaitForRenewalAsync() => renewalObserved.Task;

  /// <summary>Waits until a real renewal persistence attempt has reached this broker.</summary>
  /// <returns>A task completed by the next renewal write attempt, including failed attempts.</returns>
  internal Task WaitForRenewalAttemptAsync() => renewalAttempted.Task;

  /// <summary>Waits until a running run is read at the persistence boundary for renewal.</summary>
  /// <returns>A task completed by the renewal read before its conditional write.</returns>
  internal Task WaitForRunningRunReadAsync() => runningReadObserved.Task;

  /// <inheritdoc/>
  public ValueTask EnsureContainerAsync(CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    EnsureStoreCallCount++;

    if (EnsureFailure is not null)
    {
      return ValueTask.FromException(EnsureFailure);
    }

    return ValueTask.CompletedTask;
  }

  /// <inheritdoc/>
  public ValueTask<AnalysisRun> CreateAsync(AnalysisRun run, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add(run.TargetType == AnalysisTargetType.Invoice ? "queue-invoice-run" : "queue-merchant-run");
    AnalysisRun persisted = run.WithETag(NextETag());
    runs[persisted.Id] = persisted;
    return ValueTask.FromResult(persisted);
  }

  /// <inheritdoc/>
  public ValueTask<AnalysisRun?> ReadAsync(Guid runId, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    runs.TryGetValue(runId, out AnalysisRun? run);

    if (run?.Status == AnalysisRunStatus.Running)
    {
      runningReadObserved.TrySetResult();
    }

    return ValueTask.FromResult(run);
  }

  /// <inheritdoc/>
  public async IAsyncEnumerable<AnalysisRun> StreamClaimCandidatesAsync(
    DateTimeOffset now,
    [EnumeratorCancellation] CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("claim-run");

    foreach (AnalysisRun run in runs.Values.OrderBy(candidate => candidate.AcceptedAt).ToArray())
    {
      bool claimable = run.Status == AnalysisRunStatus.Queued
        || (run.Status == AnalysisRunStatus.Running && run.LeaseExpiresAt <= now);

      if (claimable)
      {
        yield return run;
      }
    }

    await Task.CompletedTask.ConfigureAwait(false);
  }

  /// <inheritdoc/>
  public ValueTask<IReadOnlyDictionary<AnalysisTargetType, long>> CountPendingByTargetTypeAsync(
    DateTimeOffset now,
    CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();
    timeline.Add("count-pending-runs");
    CountAttempts++;

    if (CountFailure is not null)
    {
      return ValueTask.FromException<IReadOnlyDictionary<AnalysisTargetType, long>>(CountFailure);
    }

    return ValueTask.FromResult(PendingRunCounts);
  }

  /// <inheritdoc/>
  public ValueTask<AnalysisRun> ReplaceAsync(AnalysisRun run, string expectedETag, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();

    if (!runs.TryGetValue(run.Id, out AnalysisRun? stored))
    {
      return ValueTask.FromException<AnalysisRun>(new AnalysisRunNotFoundException(run.Id));
    }

    if (!string.Equals(stored.ETag, expectedETag, StringComparison.Ordinal))
    {
      return ValueTask.FromException<AnalysisRun>(new AnalysisRunLeaseConflictException("The analysis run ETag is stale."));
    }

    bool isRenewal = stored.Status == AnalysisRunStatus.Running && run.Status == AnalysisRunStatus.Running;
    bool isTerminal = run.Status is AnalysisRunStatus.Completed or AnalysisRunStatus.Failed;

    if (isRenewal && RenewalFailure is not null)
    {
      RenewalAttemptCount++;
      renewalAttempted.TrySetResult();
      return ValueTask.FromException<AnalysisRun>(RenewalFailure);
    }

    if (isTerminal && TerminalTransitionFailure is not null)
    {
      return ValueTask.FromException<AnalysisRun>(TerminalTransitionFailure);
    }

    AnalysisRun persisted = run.WithETag(NextETag());
    runs[persisted.Id] = persisted;

    if (isRenewal)
    {
      RenewalAttemptCount++;
      renewalAttempted.TrySetResult();
      RenewalCount++;
      renewalObserved.TrySetResult();
    }

    return ValueTask.FromResult(persisted);
  }

  private string NextETag() =>
    Interlocked.Increment(ref revision).ToString(CultureInfo.InvariantCulture);
}

/// <summary>
/// Deterministic external document-intelligence double that projects configured receipt extraction into broker output.
/// </summary>
internal sealed class ControlledDocumentIntelligenceBroker : IDocumentIntelligenceBroker
{
  /// <summary>Gets or sets the extraction result to project through the real document foundation.</summary>
  internal ReceiptExtractionResult? ExtractionResult { get; set; }

  /// <summary>Gets or sets a failure emitted by the external document provider.</summary>
  internal Exception? Failure { get; set; }

  /// <inheritdoc/>
  public ValueTask<ReceiptDocument> AnalyzeReceiptAsync(Uri scanLocation, CancellationToken cancellationToken)
  {
    cancellationToken.ThrowIfCancellationRequested();

    if (Failure is not null)
    {
      return ValueTask.FromException<ReceiptDocument>(Failure);
    }

    if (ExtractionResult is null)
    {
      return ValueTask.FromException<ReceiptDocument>(new InvalidStructuredOutputException("No receipt response was scripted."));
    }

    return ValueTask.FromResult(ToReceiptDocument(ExtractionResult));
  }

  private static ReceiptDocument ToReceiptDocument(ReceiptExtractionResult extraction)
  {
    MerchantCandidate? candidate = extraction.MerchantCandidate;

    return new ReceiptDocument(
      new ReceiptMerchantDocument(
        Text(candidate?.Name, candidate?.NameConfidence ?? 0d),
        Text(candidate?.Address, candidate?.AddressConfidence ?? 0d),
        Text(candidate?.PhoneNumber, candidate?.PhoneNumberConfidence ?? 0d)),
      extraction.Products.Select(product => new ReceiptProductDocument(
        Text(product.Name, product.Confidence),
        Decimal(product.Quantity, product.Confidence),
        Text(product.QuantityUnit, product.Confidence),
        Text(product.ProductCode, product.Confidence),
        Decimal(product.Price, product.Confidence),
        Decimal(product.Quantity * product.Price, product.Confidence),
        product.Confidence)).ToArray(),
      new ReceiptPaymentDocument(
        new DocumentValue<DateTimeOffset?>(extraction.PaymentInformation.TransactionDate, 0d, -1),
        new DocumentValue<Currency?>(extraction.PaymentInformation.Currency, 0d, -1),
        Decimal(extraction.PaymentInformation.TotalCostAmount, 0d),
        Decimal(extraction.PaymentInformation.TotalTaxAmount, 0d),
        Decimal(extraction.PaymentInformation.SubtotalAmount, 0d),
        Decimal(extraction.PaymentInformation.TipAmount, 0d)),
      Text(extraction.ReceiptType, 0d),
      Text(extraction.CountryRegion, 0d),
      extraction.TaxDetails.Select(tax => new ReceiptTaxDocument(
        Decimal(tax.Amount, 0d),
        Decimal(tax.Rate, 0d),
        Decimal(tax.NetAmount, 0d),
        Text(tax.Description, 0d),
        0d)).ToArray(),
      extraction.Payments.Select(payment => new ReceiptPaymentLineDocument(
        Text(payment.Method, 0d),
        Decimal(payment.Amount, 0d),
        0d)).ToArray());
  }

  private static DocumentValue<string> Text(string? value, double confidence) =>
    new(value, confidence, -1);

  private static DocumentValue<decimal?> Decimal(decimal? value, double confidence) =>
    new(value, confidence, -1);
}

/// <summary>
/// Configurable external generative-AI double that returns typed structured provider responses for real foundations.
/// </summary>
internal sealed class AnalysisGenerativeAiBroker : IGenerativeAiBroker
{
  private TaskCompletionSource? invocationGate;
  private TaskCompletionSource? invocationEntered;

  /// <summary>Gets or sets the configured invoice capability output.</summary>
  internal InvoiceAnalysisResult? InvoiceResult { get; set; }

  /// <summary>Gets or sets the configured merchant capability output.</summary>
  internal MerchantAnalysisResult? MerchantResult { get; set; }

  /// <summary>Gets or sets the active source run identifier for classification correlation tokens.</summary>
  internal Guid? SourceRunIdentifier { get; set; }

  /// <summary>Gets or sets a failure emitted by every external generative call.</summary>
  internal Exception? Failure { get; set; }

  /// <summary>Gets or sets the deterministic provider latency applied before returning each scripted response.</summary>
  internal TimeSpan Delay { get; set; }

  /// <summary>Gets the number of external generative calls observed.</summary>
  internal int InvocationCount { get; private set; }

  /// <summary>
  /// Blocks the next provider call until <see cref="ReleaseInvocation"/> is invoked.
  /// </summary>
  /// <returns>A task completed when the provider call reaches the gate.</returns>
  internal Task BlockNextInvocation()
  {
    invocationGate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    invocationEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    return invocationEntered.Task;
  }

  /// <summary>Releases a provider call previously blocked by <see cref="BlockNextInvocation"/>.</summary>
  internal void ReleaseInvocation() => invocationGate?.TrySetResult();

  /// <inheritdoc/>
  public async Task<GenerativeResponse<T>> GenerateStructuredAsync<T>(
    GenerativeRequest request,
    CancellationToken cancellationToken)
    where T : class
  {
    cancellationToken.ThrowIfCancellationRequested();
    InvocationCount++;
    invocationEntered?.TrySetResult();

    TaskCompletionSource? gate = Interlocked.Exchange(ref invocationGate, null);
    if (gate is not null)
    {
      await gate.Task.WaitAsync(cancellationToken).ConfigureAwait(false);
    }

    if (Failure is not null)
    {
      throw Failure;
    }

    if (Delay > TimeSpan.Zero)
    {
      await Task.Delay(Delay, cancellationToken).ConfigureAwait(false);
    }

    object value = CreateResponse<T>(request);
    return new GenerativeResponse<T>((T)value, modelId: "analysis-pipeline-test", usage: null);
  }

  private object CreateResponse<T>(GenerativeRequest request)
    where T : class
  {
    if (typeof(T) == typeof(GenerativeAnalysisFoundationService.InvoiceSummaryStructuredResult))
    {
      InvoiceSummaryResult summary = InvoiceResult?.SummaryResult
        ?? throw new InvalidStructuredOutputException("Invoice summary was not scripted.");
      return new GenerativeAnalysisFoundationService.InvoiceSummaryStructuredResult(summary.Name, summary.Description);
    }

    if (typeof(T) == typeof(GenerativeAnalysisFoundationService.AllergenAssessmentBatchStructuredResult))
    {
      ProductAllergenAssessmentResult assessments = InvoiceResult?.AllergenAssessmentResult
        ?? throw new InvalidStructuredOutputException("Allergen assessment was not scripted.");

      var entries = assessments.Assessments.Select(pair => ToStructuredAssessment(pair.Key, pair.Value)).ToArray();
      return new GenerativeAnalysisFoundationService.AllergenAssessmentBatchStructuredResult(entries);
    }

    if (typeof(T) == typeof(GenerativeAnalysisFoundationService.RecipeGenerationStructuredResult))
    {
      RecipeGenerationResult recipes = InvoiceResult?.RecipeGenerationResult
        ?? throw new InvalidStructuredOutputException("Recipe generation was not scripted.");

      return new GenerativeAnalysisFoundationService.RecipeGenerationStructuredResult(
        recipes.Recipes.Select(ToStructuredRecipe).ToArray());
    }

    if (typeof(T) == typeof(GenerativeAnalysisFoundationService.SearchTermsBatchResult))
    {
      return new GenerativeAnalysisFoundationService.SearchTermsBatchResult(
        GetCorrelationTokens(request).Select(token =>
          new GenerativeAnalysisFoundationService.SearchTermsEntry(token, [ResolveSearchTerm(request)])).ToArray());
    }

    if (typeof(T) == typeof(GenerativeAnalysisFoundationService.SelectionBatchResult))
    {
      string code = ResolveClassificationCode(request);
      return new GenerativeAnalysisFoundationService.SelectionBatchResult(
        GetCorrelationTokens(request).Select(token =>
          new GenerativeAnalysisFoundationService.SelectionEntry(token, code, 0.9d)).ToArray());
    }

    if (typeof(T) == typeof(GenerativeAnalysisFoundationService.MerchantDescriptionOutput))
    {
      MerchantDescriptionResult description = MerchantResult?.DescriptionResult
        ?? throw new InvalidStructuredOutputException("Merchant description was not scripted.");
      return new GenerativeAnalysisFoundationService.MerchantDescriptionOutput(description.Description);
    }

    throw new InvalidStructuredOutputException($"No structured response was scripted for '{typeof(T).Name}'.");
  }

  private string[] GetCorrelationTokens(GenerativeRequest request)
  {
    if (request.SystemPrompt.Contains("NACE", StringComparison.Ordinal))
    {
      return [SourceRunIdentifier?.ToString() ?? throw new InvalidOperationException("A merchant run identifier was not configured.")];
    }

    if (request.SystemPrompt.Contains("ECOICOP", StringComparison.Ordinal))
    {
      return [SourceRunIdentifier?.ToString() ?? throw new InvalidOperationException("An invoice run identifier was not configured.")];
    }

    int productCount = InvoiceResult?.ExtractionResult?.Products.Count ?? 1;
    return Enumerable.Range(0, productCount)
      .Select(AnalysisCorrelationTokens.ForProduct)
      .ToArray();
  }

  private string ResolveClassificationCode(GenerativeRequest request)
  {
    if (request.SystemPrompt.Contains("NACE", StringComparison.Ordinal))
    {
      MerchantClassificationResult classification = MerchantResult?.ClassificationResult
        ?? throw new InvalidStructuredOutputException("Merchant classification was not scripted.");
      return classification.Classification.Code;
    }

    if (request.SystemPrompt.Contains("ECOICOP", StringComparison.Ordinal))
    {
      InvoiceClassificationResult classification = InvoiceResult?.InvoiceClassificationResult
        ?? throw new InvalidStructuredOutputException("Invoice classification was not scripted.");
      return classification.Classification.Code;
    }

    ProductClassificationResult classifications = InvoiceResult?.ProductClassificationResult
      ?? throw new InvalidStructuredOutputException("Product classification was not scripted.");
    return classifications.Classifications.Values.First().Code;
  }

  private static string ResolveSearchTerm(GenerativeRequest request)
  {
    if (request.SystemPrompt.Contains("NACE", StringComparison.Ordinal))
    {
      return "agriculture";
    }

    if (request.SystemPrompt.Contains("ECOICOP", StringComparison.Ordinal))
    {
      return "food";
    }

    return "milk";
  }

  private static GenerativeAnalysisFoundationService.AllergenAssessmentStructuredEntry ToStructuredAssessment(
    string token,
    ProductAllergenAssessment assessment)
  {
    IReadOnlyList<GenerativeAnalysisFoundationService.AllergenSignalStructuredEntry> signals = assessment.Signals
      .Select(signal => new GenerativeAnalysisFoundationService.AllergenSignalStructuredEntry(
        signal.Code.ToString(),
        signal.EvidenceTier == ProductAllergenEvidenceTier.Declared
          ? ProductAllergenEvidenceTier.Likely.ToString()
          : signal.EvidenceTier.ToString(),
        signal.Confidence,
        signal.Evidence.Select(evidence =>
          new GenerativeAnalysisFoundationService.AllergenEvidenceStructuredEntry(
            "productName",
            evidence.Value)).ToArray()))
      .ToArray();

    return new GenerativeAnalysisFoundationService.AllergenAssessmentStructuredEntry(
      token,
      assessment.Status.ToString(),
      signals);
  }

  private static GenerativeAnalysisFoundationService.RecipeStructuredSuggestion ToStructuredRecipe(RecipeSuggestion recipe) =>
    new(
      recipe.Name,
      recipe.Description,
      recipe.Servings,
      recipe.PreparationMinutes,
      recipe.CookingMinutes,
      recipe.TotalMinutes,
      recipe.Difficulty.ToString(),
      recipe.PurchasedIngredients.Select(ingredient =>
        new GenerativeAnalysisFoundationService.RecipeStructuredIngredient(
          ingredient.Name,
          ingredient.Quantity,
          ingredient.Preparation)).ToArray(),
      recipe.AssumedPantryStaples.Select(ingredient =>
        new GenerativeAnalysisFoundationService.RecipeStructuredIngredient(
          ingredient.Name,
          ingredient.Quantity,
          ingredient.Preparation)).ToArray(),
      recipe.MissingOptionalIngredients.Select(ingredient =>
        new GenerativeAnalysisFoundationService.RecipeStructuredIngredient(
          ingredient.Name,
          ingredient.Quantity,
          ingredient.Preparation)).ToArray(),
      recipe.Steps.Select(step =>
        new GenerativeAnalysisFoundationService.RecipeStructuredStep(
          step.Sequence,
          step.Instruction,
          step.Notes)).ToArray(),
      recipe.AllergenWarnings.Select(warning => warning.ToString()).ToArray());
}
