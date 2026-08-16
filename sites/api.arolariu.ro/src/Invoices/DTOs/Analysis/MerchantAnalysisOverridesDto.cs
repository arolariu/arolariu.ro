namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

/// <summary>
/// Represents the per-capability overrides a caller may layer over a merchant analysis profile preset.
/// </summary>
/// <remarks>
/// <para>Every member is optional. Omitted members inherit the resolved preset value. Any supplied member downgrades
/// the effective profile to <see cref="DDD.Analysis.Enums.AnalysisProfile.Custom"/>.</para>
/// </remarks>
/// <param name="MerchantClassification">Overrides NACE merchant classification.</param>
/// <param name="DescriptionGeneration">Overrides evidence-bound merchant description generation.</param>
[Serializable]
public readonly record struct MerchantAnalysisOverridesDto(
  CapabilityToggleDto? MerchantClassification,
  CapabilityToggleDto? DescriptionGeneration);
