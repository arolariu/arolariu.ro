namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Linq;

using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;

/// <summary>
/// Derives the set of merchant identifiers a user may see from that user's own invoices.
/// </summary>
/// <remarks>
/// <para>Merchant visibility is defined by invoice reference rather than by <c>CreatedBy</c>, because
/// analysis performed by any user may create the merchant record that another user's invoice references.</para>
/// <para>This type is pure and side-effect free so the rule can be tested without Cosmos.</para>
/// </remarks>
internal static class MerchantVisibilityResolver
{
  /// <summary>Collects the distinct, linked merchant identifiers referenced by the supplied invoices.</summary>
  /// <param name="invoices">The caller's invoices. May be null or empty.</param>
  /// <returns>The distinct merchant identifiers, excluding <see cref="Guid.Empty"/>.</returns>
  internal static IReadOnlyCollection<Guid> ResolveVisibleMerchantIdentifiers(IEnumerable<Invoice>? invoices) =>
    invoices is null
      ? []
      : invoices
        .Select(invoice => invoice.MerchantReference)
        .Where(reference => reference != Guid.Empty)
        .Distinct()
        .ToList();
}
