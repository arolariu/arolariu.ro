namespace arolariu.Backend.Domain.Invoices.Services.Orchestration.AnalysisService;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Canonicalizes a caller-supplied analysis option set to its published named-profile preset before a run is queued.
/// </summary>
/// <remarks>
/// <para>Profile resolution happens exactly once before
/// <see cref="IAnalysisOrchestrationService.EnqueueAnalysisAsync"/>. The resolved options are serialized on the queue
/// message; a worker MUST NOT recompute or reinterpret the profile from current defaults.</para>
/// <para><see cref="AnalysisProfile.Custom"/> option sets are always caller-composed and are returned unchanged.</para>
/// </remarks>
internal static class AnalysisProfileResolver
{
  /// <summary>
  /// Resolves the effective invoice analysis options for a named profile, or passes a custom selection through unchanged.
  /// </summary>
  /// <param name="options">The caller-supplied invoice analysis options.</param>
  /// <returns>The canonical preset for a named profile, or <paramref name="options"/> unchanged for <see cref="AnalysisProfile.Custom"/>.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="options"/> is null.</exception>
  public static InvoiceAnalysisOptions Resolve(InvoiceAnalysisOptions options)
  {
    ArgumentNullException.ThrowIfNull(options);

    return options.Profile switch
    {
      AnalysisProfile.Fast => InvoiceAnalysisOptions.Fast(),
      AnalysisProfile.Balanced => InvoiceAnalysisOptions.Balanced(),
      AnalysisProfile.Comprehensive => InvoiceAnalysisOptions.Comprehensive(),
      _ => options,
    };
  }

  /// <summary>
  /// Resolves the effective merchant analysis options for a named profile, or passes a custom selection through unchanged.
  /// </summary>
  /// <param name="options">The caller-supplied merchant analysis options.</param>
  /// <returns>The canonical preset for a named profile, or <paramref name="options"/> unchanged for <see cref="AnalysisProfile.Custom"/>.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="options"/> is null.</exception>
  public static MerchantAnalysisOptions Resolve(MerchantAnalysisOptions options)
  {
    ArgumentNullException.ThrowIfNull(options);

    return options.Profile switch
    {
      AnalysisProfile.Fast => MerchantAnalysisOptions.Fast(),
      AnalysisProfile.Balanced => MerchantAnalysisOptions.Balanced(),
      AnalysisProfile.Comprehensive => MerchantAnalysisOptions.Comprehensive(),
      _ => options,
    };
  }
}
