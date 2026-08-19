namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the request body accepted by the merchant analyze endpoint.
/// </summary>
/// <remarks>
/// <para><b>Tenant safety:</b> This body deliberately carries no user, tenant, or partition identifier. The owner of a
/// run is always resolved server-side from the authenticated principal, and the merchant's partition scope is read
/// server-side from the merchant aggregate.</para>
/// </remarks>
/// <param name="Profile">
/// The named analysis profile to resolve. Defaults to <see cref="AnalysisProfile.Comprehensive"/>; custom is output-only.
/// </param>
/// <param name="Overrides">Optional per-capability overrides layered over the resolved preset.</param>
[Serializable]
public readonly record struct AnalyzeMerchantRequestDto(
  AnalysisProfile? Profile,
  MerchantAnalysisOverridesDto? Overrides)
{
  /// <summary>
  /// Resolves the effective merchant analysis options described by this request.
  /// </summary>
  /// <returns>The effective, validated merchant analysis capability selection.</returns>
  /// <exception cref="ArgumentException">
  /// Thrown when the resolved capability set is empty or when <see cref="AnalysisProfile.Custom"/> is requested.
  /// </exception>
  public MerchantAnalysisOptions ToMerchantAnalysisOptions() =>
    AnalysisOptionsResolver.ResolveMerchantOptions(Profile, Overrides);
}
