namespace arolariu.Backend.Domain.Invoices.Services.Processing.AnalysisService;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Allergens;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public sealed partial class AnalysisProcessingService
{
  private const string TargetPersistenceFailureCode = "TARGET_PERSISTENCE_FAILED";

  /// <summary>
  /// Executes a claimed invoice run end to end: load, analyze, resolve the merchant, patch, persist, complete.
  /// </summary>
  /// <remarks>
  /// <para><b>Failure boundary:</b> Capability failures are already absorbed by the orchestration layer and simply
  /// yield a <see langword="null"/> patch section. A failure while persisting the analyzed aggregates is different in
  /// kind - the run produced results that could not be durably stored - so it fails the run explicitly instead of
  /// completing it and silently losing the output.</para>
  /// </remarks>
  /// <param name="run">The claimed invoice run.</param>
  /// <param name="leaseOwner">The worker holding the lease.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  [SuppressMessage(
    "Design",
    "CA1031:Do not catch general exception types",
    Justification = "Any persistence failure fails the run explicitly rather than completing it and silently discarding analysis output.")]
  private async Task ExecuteInvoiceRunAsync(
    AnalysisRun run,
    string leaseOwner,
    CancellationToken cancellationToken)
  {
    using var activity = InvoicePackageTracing.StartActivity(nameof(ExecuteInvoiceRunAsync));
    activity?.SetTag("analysis.run_id", run.Id.ToString());
    activity?.SetTag("analysis.target_id", run.TargetId.ToString());

    Invoice invoice = await invoiceOrchestrationService
      .ReadInvoiceObject(run.TargetId, run.TargetPartitionIdentifier ?? run.RequestedBy, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(invoice);

    InvoiceAnalysisResult result = await analysisOrchestrationService
      .AnalyzeInvoiceAsync(run, invoice, cancellationToken)
      .ConfigureAwait(false);

    ArgumentNullException.ThrowIfNull(result);

    // The merchant is resolved before the patch is built so the linkage becomes an explicit patch section rather
    // than an implicit side effect of persistence ordering.
    ResolvedMerchant? resolvedMerchant = await ResolveMerchantForInvoiceAsync(run, result, cancellationToken)
      .ConfigureAwait(false);

    var patch = new InvoiceAnalysisPatch(
      result.ExtractionResult,
      resolvedMerchant?.Merchant.id,
      result.SummaryResult,
      result.ProductClassificationResult,
      result.AllergenAssessmentResult,
      result.InvoiceClassificationResult,
      result.RecipeGenerationResult);

    ApplyInvoicePatch(invoice, patch, run.Id);
    activity?.SetTag("analysis.patch_has_changes", patch.HasChanges);

    try
    {
      if (resolvedMerchant is not null)
      {
        await PersistMerchantLinkageAsync(resolvedMerchant, invoice.id, cancellationToken).ConfigureAwait(false);
      }

      await invoiceOrchestrationService
        .UpdateInvoiceObject(invoice, invoice.id, invoice.UserIdentifier, cancellationToken)
        .ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
      // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
      throw;
    }
    catch (Exception exception)
    {
      logger.LogAnalysisProcessingTargetPersistenceFailed(run.Id.ToString(), exception.Message);
      await FailRunAsync(run, leaseOwner, TargetPersistenceFailureCode, cancellationToken).ConfigureAwait(false);
      return;
    }

    await analysisOrchestrationService
      .CompleteRunAsync(run.Id, leaseOwner, result.CompletedCapabilities, DateTimeOffset.UtcNow, cancellationToken)
      .ConfigureAwait(false);
  }

  /// <summary>
  /// Resolves the merchant referenced by an invoice analysis result, creating it when it is not yet known.
  /// </summary>
  /// <remarks>
  /// <para>Lookup is by canonical normalized name, which is the same key the merchant orchestration service uses, so
  /// repeated analyses of receipts from the same store converge on a single merchant entity instead of accumulating
  /// duplicates.</para>
  /// </remarks>
  /// <param name="run">The claimed run, used to attribute the created merchant.</param>
  /// <param name="result">The invoice analysis result carrying the merchant candidate.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>The resolved or newly created merchant, or <see langword="null"/> when the run produced no candidate.</returns>
  private async Task<ResolvedMerchant?> ResolveMerchantForInvoiceAsync(
    AnalysisRun run,
    InvoiceAnalysisResult result,
    CancellationToken cancellationToken)
  {
    // Only the dedicated merchant-resolution section is honoured. The extraction result may still carry a merchant
    // candidate when merchant resolution was switched off, and reading through to it would silently re-enable a
    // capability the caller explicitly disabled.
    MerchantCandidate? candidate = result.MerchantCandidateResult;

    if (candidate is null || string.IsNullOrWhiteSpace(candidate.Name))
    {
      return null;
    }

    string normalizedName = MerchantNameNormalizer.Normalize(candidate.Name);

    if (string.IsNullOrEmpty(normalizedName))
    {
      return null;
    }

    Merchant? existing = await merchantOrchestrationService
      .FindMerchantByNormalizedNameObject(normalizedName, cancellationToken)
      .ConfigureAwait(false);

    if (existing is not null)
    {
      return new ResolvedMerchant(existing, IsNew: false);
    }

    var created = new Merchant
    {
      id = Guid.CreateVersion7(),
      Name = candidate.Name,
      ParentCompanyId = Guid.Empty,
      Address = new ContactInformation
      {
        Address = candidate.Address,
        PhoneNumber = candidate.PhoneNumber,
      },
      CreatedBy = run.RequestedBy,
      CreatedAt = DateTimeOffset.UtcNow,
    };

    return new ResolvedMerchant(created, IsNew: true);
  }

  /// <summary>
  /// Persists the merchant side of the invoice-to-merchant linkage.
  /// </summary>
  /// <param name="resolved">The resolved merchant plus whether it still has to be created.</param>
  /// <param name="invoiceIdentifier">The invoice being linked.</param>
  /// <param name="cancellationToken">The cancellation token that aborts the operation.</param>
  /// <returns>Asynchronous task.</returns>
  private async Task PersistMerchantLinkageAsync(
    ResolvedMerchant resolved,
    Guid invoiceIdentifier,
    CancellationToken cancellationToken)
  {
    Merchant merchant = resolved.Merchant;
    bool alreadyReferenced = merchant.ReferencedInvoices.Contains(invoiceIdentifier);

    if (!alreadyReferenced)
    {
      merchant.ReferencedInvoices.Add(invoiceIdentifier);
    }

    if (resolved.IsNew)
    {
      await merchantOrchestrationService
        .CreateMerchantObject(merchant, merchant.ParentCompanyId, cancellationToken)
        .ConfigureAwait(false);
      return;
    }

    if (!alreadyReferenced)
    {
      await merchantOrchestrationService
        .UpdateMerchantObject(merchant, merchant.id, merchant.ParentCompanyId, cancellationToken)
        .ConfigureAwait(false);
    }
  }

  /// <summary>
  /// Applies every non-null patch section to the invoice aggregate.
  /// </summary>
  /// <remarks>
  /// <para><b>Section semantics:</b> A <see langword="null"/> section means the capability produced no usable result
  /// and the previously persisted value is left untouched. A non-null section is authoritative and replaces the
  /// previous value, <em>including</em> when it carries an empty collection.</para>
  /// </remarks>
  /// <param name="invoice">The aggregate to mutate.</param>
  /// <param name="patch">The patch produced from the analysis result.</param>
  /// <param name="sourceRunId">The run that produced the patch, stamped onto allergen assessments.</param>
  private static void ApplyInvoicePatch(Invoice invoice, InvoiceAnalysisPatch patch, Guid sourceRunId)
  {
    if (patch.ExtractionUpdate is not null)
    {
      ApplyExtraction(invoice, patch.ExtractionUpdate);
    }

    if (patch.MerchantReferenceUpdate is not null)
    {
      invoice.MerchantReference = patch.MerchantReferenceUpdate.Value;
    }

    if (patch.SummaryUpdate is not null)
    {
      invoice.Name = patch.SummaryUpdate.Name;
      invoice.Description = patch.SummaryUpdate.Description;
    }

    if (patch.ProductClassificationUpdate is not null)
    {
      ApplyProductClassifications(invoice, patch.ProductClassificationUpdate);
    }

    if (patch.AllergenAssessmentUpdate is not null)
    {
      ApplyAllergenAssessments(invoice, patch.AllergenAssessmentUpdate, sourceRunId);
    }

    if (patch.InvoiceClassificationUpdate is not null)
    {
      invoice.Classification = patch.InvoiceClassificationUpdate.Classification;
    }

    if (patch.RecipeGenerationUpdate is not null)
    {
      invoice.PossibleRecipes = [.. patch.RecipeGenerationUpdate.Recipes];
    }
  }

  /// <summary>
  /// Applies a successful document-extraction section onto the invoice aggregate.
  /// </summary>
  /// <remarks>
  /// <para>The extracted line items are authoritative about which products the invoice has, so they replace the
  /// collection outright - including when the extraction legitimately produced none. Prior per-item analysis
  /// artifacts and user workflow flags are carried onto recognizably identical products by
  /// <see cref="ExtractedProductReconciler"/>; see that type for the identity-free matching contract.</para>
  /// </remarks>
  /// <param name="invoice">The aggregate to mutate.</param>
  /// <param name="extraction">The successful extraction section.</param>
  private static void ApplyExtraction(Invoice invoice, ReceiptExtractionResult extraction)
  {
    invoice.Items = ExtractedProductReconciler.Reconcile(invoice.Items, extraction.Products);
    invoice.PaymentInformation = extraction.PaymentInformation;
    invoice.ReceiptType = extraction.ReceiptType;
    invoice.CountryRegion = extraction.CountryRegion;
    invoice.TaxDetails = [.. extraction.TaxDetails];
    invoice.Payments = [.. extraction.Payments];
  }

  private static void ApplyProductClassifications(Invoice invoice, ProductClassificationResult classifications)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      string token = AnalysisCorrelationTokens.ForProduct(index);

      if (classifications.Classifications.TryGetValue(token, out var classification))
      {
        items[index].Classification = classification;
      }
    }
  }

  private static void ApplyAllergenAssessments(
    Invoice invoice,
    ProductAllergenAssessmentResult assessments,
    Guid sourceRunId)
  {
    var items = invoice.Items as IList<Product> ?? [.. invoice.Items];

    for (int index = 0; index < items.Count; index++)
    {
      string token = AnalysisCorrelationTokens.ForProduct(index);

      if (assessments.Assessments.TryGetValue(token, out var assessment))
      {
        items[index].AllergenAssessment = ToPersistedAssessment(assessment, sourceRunId);
      }
    }
  }

  /// <summary>
  /// Projects the transient analysis-side allergen assessment onto its persisted value object.
  /// </summary>
  /// <remarks>
  /// <para>The two shapes are deliberately distinct: the analysis result models evidence tiers as produced by the
  /// generative capability, while the persisted value object models durable evidence levels and carries the source
  /// run identifier for provenance.</para>
  /// </remarks>
  /// <param name="assessment">The transient assessment produced by the analysis run.</param>
  /// <param name="sourceRunId">The run that produced the assessment.</param>
  /// <returns>The persisted allergen assessment value object.</returns>
  private static AllergenAssessment ToPersistedAssessment(ProductAllergenAssessment assessment, Guid sourceRunId) =>
    assessment.Status switch
    {
      ProductAllergenAssessmentStatus.SignalsFound => AllergenAssessment.Detected(
        sourceRunId,
        [.. assessment.Signals.Select(ToPersistedSignal)]),
      ProductAllergenAssessmentStatus.NoSignalsInAvailableEvidence => AllergenAssessment.NoSignals(sourceRunId),
      _ => AllergenAssessment.Insufficient(sourceRunId),
    };

  private static AllergenSignal ToPersistedSignal(ProductAllergenSignal signal) => new(
    signal.Code,
    ToEvidenceLevel(signal.EvidenceTier),
    signal.Confidence,
    signal.Evidence);

  private static AllergenEvidenceLevel ToEvidenceLevel(ProductAllergenEvidenceTier tier) => tier switch
  {
    ProductAllergenEvidenceTier.Declared => AllergenEvidenceLevel.Explicit,
    ProductAllergenEvidenceTier.Likely => AllergenEvidenceLevel.Inferred,
    _ => AllergenEvidenceLevel.Precautionary,
  };

  /// <summary>
  /// Pairs a resolved merchant with whether it still has to be created.
  /// </summary>
  /// <param name="Merchant">The resolved merchant entity.</param>
  /// <param name="IsNew">Whether the merchant was minted during this run and is not yet persisted.</param>
  private sealed record ResolvedMerchant(Merchant Merchant, bool IsNew);
}
