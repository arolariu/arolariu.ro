namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the request body accepted by the invoice analyze endpoint.
/// </summary>
/// <remarks>
/// <para><b>Tenant safety:</b> This body deliberately carries no user, tenant, or partition identifier. The owner of a
/// run is always resolved server-side from the authenticated principal, so a caller can never queue analysis on behalf
/// of another user by editing the payload.</para>
/// <para><b>Resolution order:</b> the profile (defaulting to <see cref="AnalysisProfile.Balanced"/>) resolves the
/// preset baseline, then overrides are layered over it. Supplying overrides downgrades the effective profile to
/// <see cref="AnalysisProfile.Custom"/>.</para>
/// </remarks>
/// <param name="Profile">The named analysis profile to resolve. Defaults to <see cref="AnalysisProfile.Balanced"/>.</param>
/// <param name="Overrides">Optional per-capability overrides layered over the resolved preset.</param>
[Serializable]
public readonly record struct AnalyzeInvoiceRequestDto(
  AnalysisProfile? Profile,
  InvoiceAnalysisOverridesDto? Overrides)
{
  /// <summary>
  /// Resolves the effective invoice analysis options described by this request.
  /// </summary>
  /// <returns>The effective, validated invoice analysis capability selection.</returns>
  /// <exception cref="ArgumentException">
  /// Thrown when the resolved capability set is empty, violates the capability dependency closure, or when
  /// <see cref="AnalysisProfile.Custom"/> is requested without any override to customize.
  /// </exception>
  /// <exception cref="ArgumentOutOfRangeException">
  /// Thrown when the requested maximum recipe count falls outside the inclusive range 1 to 3, or when a disabled
  /// recipe capability is paired with a non-zero recipe count.
  /// </exception>
  public InvoiceAnalysisOptions ToInvoiceAnalysisOptions() =>
    AnalysisOptionsResolver.ResolveInvoiceOptions(Profile, Overrides);
}
