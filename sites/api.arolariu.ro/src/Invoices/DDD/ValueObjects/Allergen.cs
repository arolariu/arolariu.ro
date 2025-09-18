namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects;

using System;
using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Represents an identified or inferred allergen associated with an invoice product line.
/// </summary>
/// <remarks>
/// <para>Captures canonical allergen taxonomy information used for dietary risk surfacing, recipe suitability filtering and future
/// health profile personalization.</para>
/// <para><b>Mutation:</b> Instances are mutable for progressive enrichment (name normalization, description augmentation, documentation link updates).</para>
/// <para><b>Thread-safety:</b> Not thread-safe. Treat each instance as aggregate-scoped.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed record Allergen
{
  /// <summary>Canonical allergen display name (e.g. "Peanuts", "Gluten").</summary>
  /// <remarks><para>Empty string denotes unresolved extraction; SHOULD be populated by enrichment pipeline.</para></remarks>
  public string Name { get; set; } = string.Empty;

  /// <summary>Human-readable descriptive context for the allergen.</summary>
  /// <remarks><para>Intended for UI tooltips and accessibility narration. MAY be empty if not yet enriched.</para></remarks>
  public string Description { get; set; } = string.Empty;

  /// <summary>Reference URI for authoritative or supplemental allergen information.</summary>
  /// <remarks><para>Defaults to project documentation site. SHOULD be replaced with domain knowledge base / medical authority link when available.</para></remarks>
  public Uri LearnMoreAddress { get; set; } = new Uri("https://arolariu.ro");
}
