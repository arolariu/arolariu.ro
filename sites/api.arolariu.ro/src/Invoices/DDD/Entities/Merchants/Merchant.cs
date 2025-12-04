namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// Represents a merchant (vendor / store) referenced by one or more invoices within the invoicing bounded context.
/// </summary>
/// <remarks>
/// <para>Encapsulates classification (<c>Category</c>), location/contact data (<c>Address</c>), hierarchical grouping (<c>ParentCompanyId</c>)
/// and reverse references from invoices (<c>ReferencedInvoices</c>) for analytic aggregation.</para>
/// <para><b>Identity:</b> Assigned at creation time (random GUID). Future optimization may migrate to Version 7 GUID for chronological sorting.</para>
/// <para><b>Relationships:</b> Not an aggregate root for invoices (invoices own the relationship by storing <c>MerchantReference</c>). This type acts
/// as a referenced entity; deleting a merchant should not cascade to invoices without explicit orchestration logic.</para>
/// <para><b>Thread-safety:</b> Not thread-safe — treat instances as single-thread scoped.</para>
/// <para><b>Soft Delete:</b> Not currently implementing soft-delete flags at this level; deletion semantics handled at persistence/broker layer if added.</para>
/// </remarks>
[ExcludeFromCodeCoverage]
public sealed class Merchant : NamedEntity<Guid>
{
  /// <summary>Immutable merchant identity.</summary>
  /// <remarks>
  /// <para>Generated via <see cref="Guid.NewGuid()"/>; no ordering guarantees. Consider Version 7 GUID if chronological sorting becomes a requirement.</para>
  /// </remarks>
  [JsonPropertyName("id")]
  [JsonPropertyOrder(0)]
  public override Guid id { get; init; } = Guid.NewGuid();

  /// <summary>Domain classification used for analytics, grouping and enrichment heuristics.</summary>
  /// <remarks><para>Defaults to <see cref="MerchantCategory.OTHER"/> when unclassified. Downstream enrichment processes SHOULD minimize long-term usage of OTHER.</para></remarks>
  [JsonPropertyOrder(3)]
  public MerchantCategory Category { get; set; } = MerchantCategory.OTHER;

  /// <summary>Structured contact / address information.</summary>
  /// <remarks><para>Represents a value object snapshot. Entire object is typically replaced on update; no deep merge semantics currently.</para></remarks>
  [JsonPropertyOrder(4)]
  public ContactInformation Address { get; set; } = new ContactInformation();

  /// <summary>Optional linkage to a parent company (hierarchical reporting / consolidation).</summary>
  /// <remarks><para><c>Guid.Empty</c> indicates no parent company assigned.</para></remarks>
  [JsonPropertyOrder(5)]
  public Guid ParentCompanyId { get; set; } = Guid.Empty;

  /// <summary>Reverse references to invoices that currently point to this merchant.</summary>
  /// <remarks>
  /// <para>Maintained for read-optimization / analytics. Contents are not automatically pruned on invoice deletion; reconciliation job may be required.</para>
  /// <para>Order reflects insertion order; duplicates are not automatically filtered (caller MUST prevent duplicate insertion).</para>
  /// </remarks>
  [JsonPropertyOrder(6)]
  public ICollection<Guid> ReferencedInvoices { get; init; } = [];

  /// <summary>Extensible key/value metadata (lightweight tagging / enrichment layer).</summary>
  /// <remarks>
  /// <para>Key namespaces SHOULD use a dotted convention (e.g. <c>ai.confidence</c>, <c>user.note</c>, <c>integration.source</c>).</para>
  /// <para>Values are stored as strings for portability; upstream systems must handle serialization of complex types.</para>
  /// <para>Write Semantics: Last writer wins per key; no historical versioning.</para>
  /// </remarks>
  [JsonPropertyOrder(7)]
  public IDictionary<string, string> AdditionalMetadata { get; init; } = new Dictionary<string, string>();

  /// <summary>
  /// Create a default instance of <see cref="Merchant"/>.
  /// </summary>
  /// <returns></returns>
  internal static Merchant Default() => new Merchant
  {
    id = Guid.Empty,
    ParentCompanyId = Guid.Empty,
  };
}
