namespace arolariu.Backend.Domain.Invoices.DTOs.Analysis;

using System;

/// <summary>
/// Represents a caller-supplied override that explicitly enables or disables a single analysis capability.
/// </summary>
/// <remarks>
/// <para>A capability with no toggle inherits the value from the resolved profile preset. Supplying any toggle
/// downgrades the effective profile to <see cref="DDD.Analysis.Enums.AnalysisProfile.Custom"/>.</para>
/// </remarks>
/// <param name="Enabled">Whether the capability should execute during the run.</param>
[Serializable]
public readonly record struct CapabilityToggleDto(bool Enabled);
