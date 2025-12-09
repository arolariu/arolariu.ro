namespace arolariu.Backend.Domain.Invoices.DTOs.Requests;

using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Data transfer object for patching metadata on an invoice.
/// </summary>
/// <remarks>
/// <para><b>Purpose:</b> Allows adding or updating metadata key-value pairs on an invoice.</para>
/// <para><b>Merge Strategy:</b> New entries are added; existing keys are overwritten (last writer wins).</para>
/// <para><b>Keys:</b> Should follow dotted namespace convention (e.g., "ai.confidence", "user.note").</para>
/// </remarks>
/// <param name="Entries">Dictionary of metadata entries to add or update.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct PatchMetadataRequestDto(
  [Required] IDictionary<string, object> Entries)
{
  /// <summary>
  /// Applies the metadata entries to an existing metadata dictionary.
  /// </summary>
  /// <param name="existingMetadata">The existing metadata dictionary to update.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="existingMetadata"/> is null.</exception>
  public void ApplyTo(IDictionary<string, object> existingMetadata)
  {
    ArgumentNullException.ThrowIfNull(existingMetadata);
    foreach (var (key, value) in Entries)
    {
      existingMetadata[key] = value;
    }
  }
}
