namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

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
/// <param name="MerchantClassification">Optional NACE classification selection.</param>
/// <param name="DescriptionGeneration">Optional merchant description generation selection.</param>
[Serializable]
public readonly record struct MerchantAnalysisRequestDto(
  AnalysisProfile? Profile,
  bool? MerchantClassification,
  bool? DescriptionGeneration)
{
  /// <summary>
  /// Resolves the effective merchant analysis options described by this request.
  /// </summary>
  /// <returns>The effective, validated merchant analysis capability selection.</returns>
  /// <exception cref="ArgumentException">
  /// Thrown when the resolved capability set is empty or when <see cref="AnalysisProfile.Custom"/> is requested.
  /// </exception>
  public MerchantAnalysisOptions ToMerchantAnalysisOptions()
  {
    AnalysisProfile requestedProfile = Profile ?? AnalysisProfile.Comprehensive;

    if (!Enum.IsDefined(requestedProfile))
    {
      throw new ArgumentOutOfRangeException(
        nameof(Profile),
        requestedProfile,
        "Profile must be a defined analysis profile.");
    }

    if (requestedProfile == AnalysisProfile.Custom)
    {
      throw new ArgumentException(
        "The custom profile is an effective response value and cannot be requested.",
        nameof(Profile));
    }

    MerchantAnalysisOptions baseline = ResolveBaseline(requestedProfile);

    if (MerchantClassification is null && DescriptionGeneration is null)
    {
      return baseline;
    }

    bool merchantClassification = MerchantClassification ?? baseline.MerchantClassification;
    bool descriptionGeneration = DescriptionGeneration ?? baseline.DescriptionGeneration;

    if (!merchantClassification && !descriptionGeneration)
    {
      throw new ArgumentException(
        "An analysis run must enable at least one capability.",
        nameof(MerchantAnalysisRequestDto));
    }

    return new MerchantAnalysisOptions(
      AnalysisProfile.Custom,
      merchantClassification,
      descriptionGeneration);
  }

  private static MerchantAnalysisOptions ResolveBaseline(AnalysisProfile profile) =>
    profile switch
    {
      AnalysisProfile.Comprehensive => MerchantAnalysisOptions.Comprehensive(),
      AnalysisProfile.Fast => MerchantAnalysisOptions.Fast(),
      _ => MerchantAnalysisOptions.Balanced(),
    };
}
