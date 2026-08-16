namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System.Collections.Generic;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the transient, best-effort outcome of a single merchant analysis run.
/// </summary>
/// <remarks>
/// <para>Each capability section is independently nullable: a <see langword="null"/> section means either the
/// capability was disabled by the run's effective <c>MerchantAnalysisOptions</c>, or the capability was attempted
/// and failed. Callers MUST NOT infer disablement vs. failure from a null section alone; use
/// <see cref="CompletedCapabilities"/> to distinguish attempted-and-failed from never-attempted.</para>
/// </remarks>
/// <param name="ClassificationResult">The canonical NACE 2.1 merchant classification, or <see langword="null"/> when classification was disabled or failed.</param>
/// <param name="DescriptionResult">The generated merchant description, or <see langword="null"/> when description generation was disabled or failed.</param>
/// <param name="CompletedCapabilities">The capabilities that produced a usable result during this run.</param>
public sealed record MerchantAnalysisResult(
  MerchantClassificationResult? ClassificationResult,
  MerchantDescriptionResult? DescriptionResult,
  IReadOnlyCollection<AnalysisCapability> CompletedCapabilities);
