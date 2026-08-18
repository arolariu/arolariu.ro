namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

/// <summary>
/// Represents the per-capability overrides a caller may layer over a merchant analysis profile preset.
/// </summary>
/// <remarks>
/// <para>Every member is optional. Omitted members inherit the resolved preset value. An object with every member
/// omitted preserves the named profile; any supplied capability member produces the effective
/// <see cref="DDD.Analysis.Enums.AnalysisProfile.Custom"/> profile.</para>
/// </remarks>
/// <param name="MerchantClassification">Overrides NACE merchant classification.</param>
/// <param name="DescriptionGeneration">Overrides evidence-bound merchant description generation.</param>
[Serializable]
public readonly record struct MerchantAnalysisOverridesDto(
  CapabilityToggleDto? MerchantClassification,
  CapabilityToggleDto? DescriptionGeneration);
