namespace arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;

using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Common.DDD.ValueObjects;
using arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Classifications;

/// <summary>
/// Represents a merchant (vendor / store) referenced by one or more invoices within the invoicing bounded context.
/// </summary>
/// <remarks>
/// <para>Encapsulates classification (<c>Classification</c>), the inherited generated <c>Description</c>, location/contact data
/// (<c>Address</c>), hierarchical grouping (<c>ParentCompanyId</c>) and reverse references from invoices
/// (<c>ReferencedInvoices</c>) for analytic aggregation.</para>
/// <para><b>Identity:</b> Assigned at creation time (random GUID). Future optimization may migrate to Version 7 GUID for chronological sorting.</para>
/// <para><b>Relationships:</b> Not an aggregate root for invoices (invoices own the relationship by storing <c>MerchantReference</c>). This type acts
/// as a referenced entity; deleting a merchant should not cascade to invoices without explicit orchestration logic.</para>
/// <para><b>Thread-safety:</b> Not thread-safe — treat instances as single-thread scoped.</para>
/// <para><b>Soft Delete:</b> Not currently implementing soft-delete flags at this level; deletion semantics handled at persistence/broker layer if added.</para>
/// </remarks>
public sealed class Merchant : NamedEntity<Guid>
{
  /// <summary>Immutable merchant identity.</summary>
  /// <remarks>
  /// <para>Generated via <see cref="Guid.NewGuid()"/>; no ordering guarantees. Consider Version 7 GUID if chronological sorting becomes a requirement.</para>
  /// </remarks>
  [JsonPropertyName("id")]
  [JsonPropertyOrder(0)]
  public override Guid id { get; init; } = Guid.NewGuid();

  /// <summary>Standardised classification used for analytics, grouping and analysis heuristics.</summary>
  /// <remarks>
  /// <para><b>Expected system:</b> <see cref="ClassificationSystem.Nace21"/>. Processing resolves every manual selection canonically before persistence.</para>
  /// <para><see langword="null"/> means the merchant has not been classified yet.</para>
  /// </remarks>
  [JsonPropertyOrder(3)]
  public StandardClassification? Classification { get; set; }

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
  /// Applies client-editable merchant fields to this persisted merchant.
  /// </summary>
  /// <remarks>
  /// <para>
  /// Identity, partition membership, reverse invoice references, audit fields, soft-delete state, and importance
  /// remain owned by the persisted entity and are deliberately not copied from <paramref name="clientUpdate"/>.
  /// Moving a merchant between parent-company partitions requires an explicit cross-partition workflow and is not
  /// part of a normal merchant update.
  /// </para>
  /// <para>
  /// A null classification means no manual NACE selection was made and retains the current canonical
  /// classification. A non-null selection must already have been canonicalized by Processing through Analysis Orchestration.
  /// Non-empty client metadata intentionally replaces <see cref="AdditionalMetadata"/>. An empty collection retains
  /// the persisted metadata so a contact or classification update cannot erase server-owned enrichment.
  /// </para>
  /// </remarks>
  /// <param name="clientUpdate">The client-controlled merchant values to apply.</param>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="clientUpdate"/> is null.</exception>
  public void ApplyClientUpdate(Merchant clientUpdate)
  {
    ArgumentNullException.ThrowIfNull(clientUpdate);

    Name = clientUpdate.Name;
    Description = clientUpdate.Description;
    Address = clientUpdate.Address;

    if (clientUpdate.Classification is not null)
    {
      Classification = clientUpdate.Classification;
    }

    if (clientUpdate.AdditionalMetadata.Count > 0)
    {
      AdditionalMetadata.Clear();
      foreach (var (key, value) in clientUpdate.AdditionalMetadata)
      {
        AdditionalMetadata[key] = value;
      }
    }
  }

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
